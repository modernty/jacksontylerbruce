import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useReducer,
  useRef,
} from 'react';
import { Message, MessageContent, MessageStatus } from '@/types/message';
import { StreamEvent, ToolName, SelectPathwayInput, UpdateInvoiceFieldsInput, ApplyTemplateInput } from '@/types/claude';
import { InvoicePathway, InvoiceTheme, PartialInvoiceData } from '@/types/invoice';
import { useClaudeStream } from '@/hooks/useClaudeStream';
import { useInvoiceContext, todayFormatted, thirtyDaysFormatted } from '@/context/InvoiceContext';
import { CURRENT_USER, LUIGI } from '@/constants/currentUser';

export interface UploadedFile {
  name: string;
  mimeType: string;
  base64: string;
}

interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  streamingMessageId: string | null;
}

const initialState: ChatState = {
  messages: [],
  isStreaming: false,
  streamingMessageId: null,
};

type ChatAction =
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'APPEND_TEXT'; id: string; text: string }
  | { type: 'ADD_CONTENT_BLOCK'; id: string; content: MessageContent }
  | { type: 'FINALIZE_MESSAGE'; id: string; status?: MessageStatus }
  | { type: 'SET_STREAMING'; id: string | null }
  | { type: 'CLEAR_MESSAGES' };

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };

    case 'APPEND_TEXT':
      return {
        ...state,
        messages: state.messages.map((m) => {
          if (m.id !== action.id) return m;
          const existing = m.content.find((c) => c.type === 'text') as
            | { type: 'text'; text: string }
            | undefined;
          if (existing) {
            return {
              ...m,
              content: m.content.map((c) =>
                c.type === 'text' ? { type: 'text', text: existing.text + action.text } : c
              ),
            };
          }
          return {
            ...m,
            content: [...m.content, { type: 'text', text: action.text }],
          };
        }),
      };

    case 'ADD_CONTENT_BLOCK':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, content: [...m.content, action.content] } : m
        ),
      };

    case 'FINALIZE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, status: action.status ?? 'complete' } : m
        ),
        isStreaming: false,
        streamingMessageId: null,
      };

    case 'SET_STREAMING':
      return {
        ...state,
        isStreaming: action.id !== null,
        streamingMessageId: action.id,
      };

    case 'CLEAR_MESSAGES':
      return initialState;

    default:
      return state;
  }
}

interface ChatContextValue {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  sendMessage: (text: string, attachment?: UploadedFile, isVoice?: boolean) => Promise<void>;
  abortStream: () => void;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { stream, abort } = useClaudeStream();
  const { state: invoiceState, dispatch: invoiceDispatch } = useInvoiceContext();
  const stateRef = useRef(state);
  stateRef.current = state;
  const invoiceStateRef = useRef(invoiceState);
  invoiceStateRef.current = invoiceState;

  // Synchronously-tracked snapshot refs — updated in the same call as invoiceDispatch
  // so the snapshot is always current without waiting for React to re-render.
  const liveDataRef     = useRef<PartialInvoiceData>({});
  const liveTemplateRef = useRef<'intuit' | 'custom' | 'luigi'>('intuit');
  const liveThemeRef    = useRef<InvoiceTheme | null>(null);

  const clearChat = useCallback(() => {
    abort();
    dispatch({ type: 'CLEAR_MESSAGES' });
    invoiceDispatch({ type: 'RESET' });
    liveDataRef.current     = {};
    liveTemplateRef.current = 'intuit';
    liveThemeRef.current    = null;
  }, [abort, invoiceDispatch]);

  // Trigger the Intuit loading animation for a given assistant message.
  // The invoice_card snapshot is added separately at message_stop time (after ALL tool
  // calls have completed), so it always captures the full updated invoice data.
  // Safe to call multiple times — the `draftTriggered` flag in sendMessage prevents duplicates.
  function triggerDraftAnimation(assistantId: string) {
    dispatch({
      type: 'ADD_CONTENT_BLOCK',
      id: assistantId,
      content: { type: 'intuit_status', status: 'drafting' },
    });
  }

  // Trigger the sent-invoice animation — same shimmer/badge sequence but
  // drives the "Sending invoice → Invoice sent" sub-phase in AiMessage.
  function triggerSentAnimation(assistantId: string) {
    dispatch({
      type: 'ADD_CONTENT_BLOCK',
      id: assistantId,
      content: { type: 'intuit_status', status: 'complete' },
    });
    setTimeout(() => {
      dispatch({
        type: 'ADD_CONTENT_BLOCK',
        id: assistantId,
        content: { type: 'invoice_sent_card' },
      });
    }, 2800);
  }

  const sendMessage = useCallback(
    async (text: string, attachment?: UploadedFile, isVoice?: boolean) => {
      const isLuigiSendWithoutNote =
        CURRENT_USER === LUIGI &&
        /just send it,?\s*no message needed\.?/i.test(text.trim());

      // Hide the previously-rendered "Send invoice with Intuit" button as soon
      // as Luigi confirms "Just send it, no message needed."
      if (isLuigiSendWithoutNote) {
        invoiceDispatch({ type: 'MARK_SENT' });
      }

      const userId = `user_${Date.now()}`;
      const assistantId = `assistant_${Date.now()}`;

      // Include the attachment as an image content block so buildApiMessages
      // sends it to Claude and so it's preserved in conversation history.
      const userContent: MessageContent[] = [];
      if (attachment) {
        userContent.push({
          type: 'image',
          name: attachment.name,
          mimeType: attachment.mimeType,
          base64: attachment.base64,
        });
      }
      // Only add a text block if the user actually typed something
      if (text) userContent.push({ type: 'text', text });

      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: userId,
          role: 'user',
          content: userContent,
          status: 'complete',
          timestamp: Date.now(),
          isVoice,
        },
      });

      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: assistantId,
          role: 'assistant',
          content: [],
          status: 'streaming',
          timestamp: Date.now(),
        },
      });
      dispatch({ type: 'SET_STREAMING', id: assistantId });

      const currentMessages: Message[] = [
        ...stateRef.current.messages,
        {
          id: userId,
          role: 'user',
          content: userContent,
          status: 'complete',
          timestamp: Date.now(),
        },
      ];

      let localPathway: InvoicePathway = invoiceStateRef.current.pathway;

      // Tracks whether the draft animation has already been triggered for this
      // message, so select_pathway and apply_template don't double-fire it and
      // update_invoice_fields doesn't fire it on the initial creation turn.
      let draftTriggered = false;
      // Tracks whether this message is a send_invoice turn — prevents adding an
      // invoice_card snapshot at message_stop (sent flow uses invoice_sent_card instead).
      let sentTriggered = false;

      await stream(
        currentMessages,
        (event: StreamEvent) => {
          switch (event.type) {
            case 'text_delta':
              dispatch({ type: 'APPEND_TEXT', id: assistantId, text: event.text });
              break;

            case 'tool_use':
              handleToolUse(
                event.name,
                event.input,
                assistantId,
                localPathway,
                (pathway) => { localPathway = pathway; },
                () => draftTriggered,
                () => { draftTriggered = true; },
                () => { sentTriggered = true; },
              );
              break;

            case 'message_stop':
              // Capture the invoice_card snapshot here — AFTER all tool calls have
              // completed — so it always contains the fully-populated invoice data.
              console.log('[message_stop] draftTriggered:', draftTriggered, 'sentTriggered:', sentTriggered);
              console.log('[message_stop] liveDataRef.current:', JSON.stringify(liveDataRef.current));
              if (draftTriggered && !sentTriggered) {
                dispatch({
                  type: 'ADD_CONTENT_BLOCK',
                  id: assistantId,
                  content: {
                    type: 'invoice_card',
                    snapshot: {
                      data:     { ...liveDataRef.current },
                      template: liveTemplateRef.current,
                      theme:    liveThemeRef.current,
                    },
                  },
                });
              }
              dispatch({ type: 'FINALIZE_MESSAGE', id: assistantId });
              break;
          }
        },
        (err: Error) => {
          dispatch({
            type: 'APPEND_TEXT',
            id: assistantId,
            text: `Error: ${err.message}. Check that your API key is set in web/.env.local.`,
          });
        }
      );
    },
    [stream, invoiceDispatch]
  );

  function handleToolUse(
    name: ToolName,
    input: unknown,
    assistantId: string,
    currentPathway: InvoicePathway,
    setPathway: (p: InvoicePathway) => void,
    getDraftTriggered: () => boolean,
    setDraftTriggered: () => void,
    setSentTriggered: () => void,
  ) {
    const currentInvoiceState = invoiceStateRef.current;

    switch (name) {
      case 'select_pathway': {
        const { pathway } = input as SelectPathwayInput;
        console.log('[select_pathway] pathway:', pathway);
        setPathway(pathway);
        invoiceDispatch({ type: 'SELECT_PATHWAY', pathway });

        if (pathway === 'intuit') {
          // Always reset template/theme to intuit regardless of stale state from prior voice sessions
          invoiceDispatch({ type: 'SET_TEMPLATE', template: 'intuit' });
          liveTemplateRef.current = 'intuit';
          liveThemeRef.current = null;
        }

        const dateDefaults: Record<string, string> = {};
        if (!liveDataRef.current.invoiceDate) dateDefaults.invoiceDate = todayFormatted();
        if (!liveDataRef.current.dueDate)     dateDefaults.dueDate     = thirtyDaysFormatted();
        if (!liveDataRef.current.invoiceNumber) dateDefaults.invoiceNumber = '001';

        const seedFields = {
          ...dateDefaults,
          senderName:  CURRENT_USER.name,
          senderEmail: CURRENT_USER.email,
        };
        invoiceDispatch({ type: 'UPDATE_FIELDS', fields: seedFields });
        // Mirror into live ref
        liveDataRef.current = { ...liveDataRef.current, ...seedFields };

        if (pathway === 'intuit') {
          triggerDraftAnimation(assistantId);
          setDraftTriggered();
        }
        break;
      }

      case 'apply_template': {
        const { accent, sectionBg } = input as ApplyTemplateInput;
        const resolvedBg = sectionBg ?? '#F5F5F7';
        // Luigi's voice route gets its own template type; text route uploads use 'custom'
        const templateType = CURRENT_USER === LUIGI ? 'luigi' : 'custom';
        invoiceDispatch({ type: 'SET_THEME', theme: { accent, sectionBg: resolvedBg } });
        invoiceDispatch({ type: 'SET_TEMPLATE', template: templateType });
        // Mirror into live refs
        liveThemeRef.current    = { accent, sectionBg: resolvedBg };
        liveTemplateRef.current = templateType;

        if (!getDraftTriggered()) {
          triggerDraftAnimation(assistantId);
          setDraftTriggered();
        }
        break;
      }

      case 'update_invoice_fields': {
        console.log('[update_invoice_fields] raw input:', JSON.stringify(input));
        const { fields } = input as UpdateInvoiceFieldsInput;
        console.log('[update_invoice_fields] fields:', JSON.stringify(fields));

        if (!fields) {
          console.warn('[update_invoice_fields] fields is undefined/null — skipping');
          break;
        }

        const enriched = { ...fields };
        if (fields.invoiceDate && !fields.dueDate) {
          const base = new Date(fields.invoiceDate);
          if (!isNaN(base.getTime())) {
            base.setDate(base.getDate() + 30);
            enriched.dueDate = `${String(base.getMonth() + 1).padStart(2, '0')}/${String(base.getDate()).padStart(2, '0')}/${base.getFullYear()}`;
          }
        }

        const updateFields = {
          invoiceNumber: liveDataRef.current.invoiceNumber ?? '001',
          ...enriched,
        };
        invoiceDispatch({ type: 'UPDATE_FIELDS', fields: updateFields });
        // Mirror into live ref — always up to date even if React hasn't re-rendered yet
        liveDataRef.current = { ...liveDataRef.current, ...updateFields };

        // On follow-up messages (pathway already set, draft not yet triggered this turn),
        // re-run the Intuit animation so the user sees a fresh "calling Intuit" + updated card.
        if (!getDraftTriggered() && currentPathway === 'intuit') {
          triggerDraftAnimation(assistantId);
          setDraftTriggered();
        }
        break;
      }

      case 'show_send_button':
        invoiceDispatch({ type: 'SET_COMPLETE' });
        dispatch({
          type: 'ADD_CONTENT_BLOCK',
          id: assistantId,
          content: { type: 'send_button' },
        });
        break;

      case 'send_invoice':
        invoiceDispatch({ type: 'MARK_SENT' });
        setSentTriggered(); // prevent invoice_card from being added at message_stop
        // Luigi voice flow should keep the prior draft/Asked Intuit section visible.
        // Skip sent-animation blocks on this confirmation turn to avoid a large
        // delayed gap before the assistant text appears.
        const shouldAnimateSent = CURRENT_USER !== LUIGI;
        if (shouldAnimateSent && !getDraftTriggered()) {
          triggerSentAnimation(assistantId);
          setDraftTriggered();
        }
        break;
    }
  }

  return (
    <ChatContext.Provider value={{ state, dispatch, sendMessage, abortStream: abort, clearChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}
