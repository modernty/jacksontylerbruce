import { buildSystemPrompt } from '@/constants/systemPrompt';
import { StreamEvent, ToolName } from '@/types/claude';
import { Message } from '@/types/message';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-6';

const TOOLS = [
  {
    name: 'select_pathway',
    description:
      "Set the invoice delivery method based on the user's choice. Call this once the user has clearly indicated whether they want a PDF invoice or to send via Intuit.",
    input_schema: {
      type: 'object',
      properties: {
        pathway: {
          type: 'string',
          enum: ['pdf', 'intuit'],
          description: "The pathway the user chose: 'pdf' for a PDF invoice, 'intuit' for Intuit",
        },
      },
      required: ['pathway'],
    },
  },
  {
    name: 'update_invoice_fields',
    description:
      'Update one or more invoice fields with values provided by the user. Call this whenever new invoice data is available.',
    input_schema: {
      type: 'object',
      properties: {
        fields: {
          type: 'object',
          properties: {
            senderName: { type: 'string', description: "The invoice sender's name or business name" },
            senderEmail: { type: 'string', description: "The invoice sender's email address" },
            clientName: { type: 'string', description: "The client's name or company name" },
            clientEmail: { type: 'string', description: "The client's email address" },
            services: {
              type: 'array',
              description: 'List of services or line items',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  amount: { type: 'number' },
                },
                required: ['description', 'amount'],
              },
            },
            invoiceDate: { type: 'string', description: 'Invoice date in MM/DD/YYYY format' },
            dueDate: { type: 'string', description: 'Due date in MM/DD/YYYY format' },
            invoiceNumber: { type: 'string' },
            note: { type: 'string', description: 'Note to customer' },
            depositPercent: { type: 'number', description: 'Initial deposit percentage (e.g. 25 for 25%). Shows a deposit line below the total.' },
          },
        },
      },
      required: ['fields'],
    },
  },
  {
    name: 'show_send_button',
    description:
      'Signal that all required invoice fields have been collected and the send/download button should be shown to the user.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'send_invoice',
    description:
      'Called when the user explicitly requests to send the invoice ("send", "send it", "send the invoice", etc.). Signals the frontend to remove the send button and confirm the invoice has been sent.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'apply_template',
    description:
      "Switch the invoice card to the user's custom template style. Call this when the user uploads an image or PDF that represents their preferred invoice template. Analyze the template's colors and pass the primary brand/accent color as a hex string. Call this before update_invoice_fields.",
    input_schema: {
      type: 'object',
      properties: {
        accent: {
          type: 'string',
          description: "The primary brand or accent color extracted from the template, as a hex string (e.g. '#F43F5E'). Look for the dominant non-neutral color used for headings, highlights, or key UI elements.",
        },
        sectionBg: {
          type: 'string',
          description: "Background color for card section panels, as a hex string (e.g. '#F5F5F7'). Use a light neutral tone from the template, or omit to use the default light grey.",
        },
      },
      required: ['accent'],
    },
  },
];

interface ToolCall {
  id: string;
  name: ToolName;
  input: unknown;
}

interface TurnState {
  toolCalls: ToolCall[];
  text: string;
}

export function buildApiMessages(
  messages: Message[]
): Array<{ role: 'user' | 'assistant'; content: unknown }> {
  const result: Array<{ role: 'user' | 'assistant'; content: unknown }> = [];

  for (const msg of messages) {
    if (msg.status === 'pending' || msg.status === 'streaming') continue;

    const textBlocks = msg.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { type: 'text'; text: string }).text)
      .join('');

    if (msg.role === 'user') {
      // Build multipart content if there are file attachments
      const fileBlocks = msg.content
        .filter((c) => c.type === 'image')
        .map((c) => {
          const f = c as { type: 'image'; mimeType: string; base64: string };
          if (f.mimeType === 'application/pdf') {
            return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.base64 } };
          }
          return { type: 'image', source: { type: 'base64', media_type: f.mimeType, data: f.base64 } };
        });

      if (fileBlocks.length > 0) {
        const parts: unknown[] = [...fileBlocks];
        if (textBlocks.trim()) parts.push({ type: 'text', text: textBlocks });
        result.push({ role: 'user', content: parts });
      } else if (textBlocks.trim()) {
        result.push({ role: 'user', content: textBlocks });
      }
    } else {
      if (textBlocks.trim()) {
        result.push({ role: 'assistant', content: textBlocks });
      }
    }
  }

  return result;
}

function apiMessagesHavePdf(apiMessages: unknown[]): boolean {
  return apiMessages.some((msg) => {
    const content = (msg as { content: unknown }).content;
    if (!Array.isArray(content)) return false;
    return content.some((b) => (b as { type: string }).type === 'document');
  });
}

async function* streamOneTurn(
  apiMessages: unknown[],
  apiKey: string,
  signal: AbortSignal | undefined,
  turnState: TurnState,
  hasPdf: boolean
): AsyncGenerator<StreamEvent> {
  type QueueItem = StreamEvent | Error | null;
  const queue: QueueItem[] = [];
  let notify: (() => void) | null = null;

  function enqueue(item: QueueItem) {
    queue.push(item);
    notify?.();
    notify = null;
  }

  const xhr = new XMLHttpRequest();
  xhr.open('POST', API_URL, true);
  xhr.setRequestHeader('x-api-key', apiKey);
  xhr.setRequestHeader('anthropic-version', '2023-06-01');
  xhr.setRequestHeader('anthropic-dangerous-direct-browser-access', 'true');
  xhr.setRequestHeader('content-type', 'application/json');
  if (hasPdf) {
    xhr.setRequestHeader('anthropic-beta', 'pdfs-2024-09-25');
  }

  let processedLength = 0;
  let buffer = '';

  let currentToolName: ToolName | null = null;
  let currentToolId: string | null = null;
  let currentToolJson = '';

  function processChunk(chunk: string) {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      let event: Record<string, unknown>;
      try {
        event = JSON.parse(data);
      } catch {
        continue;
      }

      const eventType = event.type as string;

      if (eventType === 'content_block_delta') {
        const delta = event.delta as Record<string, unknown>;
        if (delta?.type === 'text_delta') {
          const text = (delta.text as string) ?? '';
          turnState.text += text;
          enqueue({ type: 'text_delta', text });
        } else if (delta?.type === 'input_json_delta') {
          currentToolJson += (delta.partial_json as string) ?? '';
        }
      }

      if (eventType === 'content_block_start') {
        const block = event.content_block as Record<string, unknown>;
        if (block?.type === 'tool_use') {
          currentToolName = block.name as ToolName;
          currentToolId = block.id as string;
          currentToolJson = '';
        }
      }

      if (eventType === 'content_block_stop') {
        if (currentToolName && currentToolId) {
          let parsedInput: unknown = {};
          try {
            parsedInput = currentToolJson ? JSON.parse(currentToolJson) : {};
          } catch {
            parsedInput = {};
          }
          const toolCall: ToolCall = {
            id: currentToolId,
            name: currentToolName,
            input: parsedInput,
          };
          turnState.toolCalls.push(toolCall);
          enqueue({ type: 'tool_use', name: currentToolName, input: parsedInput });
          currentToolName = null;
          currentToolId = null;
          currentToolJson = '';
        }
      }

      if (eventType === 'message_stop') {
        enqueue(null);
      }
    }
  }

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 3 || xhr.readyState === 4) {
      const newText = xhr.responseText.slice(processedLength);
      processedLength = xhr.responseText.length;
      if (newText) processChunk(newText);
    }

    if (xhr.readyState === 4) {
      if (xhr.status !== 200) {
        enqueue(new Error(`Anthropic API error ${xhr.status}: ${xhr.responseText}`));
      } else {
        enqueue(null);
      }
    }
  };

  xhr.onerror = () => enqueue(new Error('Network error'));
  xhr.onabort = () => enqueue(null);

  signal?.addEventListener('abort', () => xhr.abort());

  xhr.send(JSON.stringify({
    model: MODEL,
    max_tokens: 4096,
    stream: true,
    system: buildSystemPrompt(),
    tools: TOOLS,
    messages: apiMessages,
  }));

  while (true) {
    while (queue.length > 0) {
      const item = queue.shift()!;
      if (item === null) return;
      if (item instanceof Error) throw item;
      yield item as StreamEvent;
    }

    if (signal?.aborted) return;

    await new Promise<void>(resolve => { notify = resolve; });
  }
}

export async function* streamClaude(
  messages: Message[],
  apiKey: string,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  let apiMessages: unknown[] = buildApiMessages(messages);

  if (apiMessages.length === 0 || (apiMessages[apiMessages.length - 1] as { role: string }).role !== 'user') {
    return;
  }

  while (true) {
    if (signal?.aborted) return;

    const turnState: TurnState = { toolCalls: [], text: '' };
    const hasPdf = apiMessagesHavePdf(apiMessages);

    for await (const event of streamOneTurn(apiMessages, apiKey, signal, turnState, hasPdf)) {
      yield event;
    }

    if (signal?.aborted) return;

    if (turnState.toolCalls.length === 0) {
      yield { type: 'message_stop' };
      break;
    }

    const assistantContent: unknown[] = [];
    if (turnState.text) {
      assistantContent.push({ type: 'text', text: turnState.text });
    }
    for (const tc of turnState.toolCalls) {
      assistantContent.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input });
    }

    const toolResults = turnState.toolCalls.map(tc => ({
      type: 'tool_result',
      tool_use_id: tc.id,
      content: 'success',
    }));

    apiMessages = [
      ...apiMessages,
      { role: 'assistant', content: assistantContent },
      { role: 'user', content: toolResults },
    ];
  }
}
