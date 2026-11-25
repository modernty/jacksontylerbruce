import { InvoiceCardSnapshot } from '@/types/invoice';

export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error';
export type IntuitStatus = 'asked' | 'drafting' | 'ready' | 'complete';

export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'image'; name: string; mimeType: string; base64: string }
  | { type: 'intuit_status'; status: IntuitStatus }
  | { type: 'invoice_card'; snapshot: InvoiceCardSnapshot }
  | { type: 'invoice_sent_card' }
  | { type: 'invoice_paid_card' }
  | { type: 'send_button' };

export interface Message {
  id: string;
  role: MessageRole;
  content: MessageContent[];
  status: MessageStatus;
  timestamp: number;
  isVoice?: boolean;
}
