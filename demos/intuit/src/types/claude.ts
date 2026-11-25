export type ToolName =
  | 'select_pathway'
  | 'update_invoice_fields'
  | 'show_send_button'
  | 'apply_template'
  | 'send_invoice';

export type StreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use'; name: ToolName; input: unknown }
  | { type: 'message_stop' };

export interface SelectPathwayInput {
  pathway: 'pdf' | 'intuit';
}

export interface UpdateInvoiceFieldsInput {
  fields: {
    senderName?: string;
    senderEmail?: string;
    clientName?: string;
    clientEmail?: string;
    services?: Array<{ description: string; amount: number }>;
    dueDate?: string;
    invoiceDate?: string;
    note?: string;
  };
}

export interface ApplyTemplateInput {
  /** Primary brand/accent color extracted from the template, as a hex string */
  accent: string;
  /** Section panel background color, as a hex string (optional) */
  sectionBg?: string;
}
