import type { StreamEvent } from '@/types/claude';

/**
 * Autoplay mode for the portfolio. The prototype normally streams from Claude; here each turn
 * replays what its system prompt fixes word for word, so the loop is exact, offline and free.
 * Turn n answers the n-th user message (0-based).
 */
export function isAutoplay(): boolean {
  return new URLSearchParams(window.location.search).has('autoplay');
}

export const CLIENT = { name: 'ACME Corporation', email: 'billing@acmecorp.com' };

type Turn = { tools: Array<{ name: Extract<StreamEvent, { type: 'tool_use' }>['name']; input: unknown }>; text: string };

const TURNS: Turn[] = [
  {
    tools: [],
    text:
      `Happy to help you bill ${CLIENT.name}. How would you like to send it?\n\n` +
      '- **PDF invoice** — I can generate a clean, professional invoice that you can download and send directly to your client.\n' +
      '- **Invoice with Intuit** — Fast, free invoicing sent directly to your client — with built-in payment and tracking.\n\n' +
      'Which would you prefer?',
  },
  {
    tools: [
      { name: 'select_pathway', input: { pathway: 'intuit' } },
      { name: 'update_invoice_fields', input: { fields: { clientName: CLIENT.name } } },
    ],
    text:
      "Your draft is ready. Here's what I still need:\n\n" +
      '• **Client email**\n' +
      '• **Services** — what you did and the amount\n\n' +
      "If you have an existing invoice, upload it and I'll recreate the layout, logo, and details for you.",
  },
  {
    tools: [
      { name: 'update_invoice_fields', input: { fields: { clientEmail: CLIENT.email, services: [{ description: 'Website redesign', amount: 6500 }] } } },
      { name: 'show_send_button', input: {} },
    ],
    text:
      "**Your invoice has been updated. It is now ready to be sent. Here's what happens next:**\n\n" +
      '- 💳 **Easy payment for your client** — your client can pay by card or bank transfer right from the invoice\n' +
      '- ⚡ **Instant money transfers** — get your money immediately with Intuit Wallet\n' +
      '- ✅ **Real-time status** — know the moment your client views and pays.\n\n' +
      'Ready to send it?',
  },
  {
    tools: [{ name: 'send_invoice', input: {} }],
    text:
      `Your invoice has been sent to the customer's email, **${CLIENT.email}**. I'll update you once they have paid.\n\n` +
      'Tap the button above to finish setting up your Intuit Wallet.\n\n' +
      'With your Intuit Wallet, you can get paid instantly from clients, send payments to vendors, and manage all your money in one place — all connected to QuickBooks.',
  },
];

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { window.clearTimeout(timer); resolve(); }, { once: true });
  });

/** One scripted reply: a short think, the tool calls, then the text in word-sized chunks. */
export async function* scriptedTurn(index: number, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
  const turn = TURNS[Math.min(Math.max(index, 0), TURNS.length - 1)];
  await wait(700, signal);
  for (const tool of turn.tools) {
    if (signal?.aborted) return;
    yield { type: 'tool_use', name: tool.name, input: tool.input };
    await wait(120, signal);
  }
  for (const chunk of turn.text.match(/\S+\s*|\s+/g) ?? []) {
    if (signal?.aborted) return;
    yield { type: 'text_delta', text: chunk };
    await wait(28, signal);
  }
  yield { type: 'message_stop' };
}
