export type InvoicePathway = 'pdf' | 'intuit' | null;

export interface ServiceLine {
  description: string;
  amount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  senderName: string;
  senderEmail: string;
  invoiceDate: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  services: ServiceLine[];
  note: string;
  depositPercent: number;
}

export type PartialInvoiceData = Partial<InvoiceData>;
export type InvoiceFieldKey = keyof InvoiceData;

/**
 * Visual tokens extracted from a user-uploaded template.
 * Applied to CustomTemplateCard to match the template's brand style.
 */
export interface InvoiceTheme {
  /** Primary brand/accent color — used for sender name, total row. Hex string e.g. '#F43F5E' */
  accent: string;
  /** Section panel background color. Hex string e.g. '#F5F5F7' */
  sectionBg: string;
}

export const DEFAULT_THEME: InvoiceTheme = {
  accent: '#F43F5E',
  sectionBg: '#F5F5F7',
};

/** Frozen state embedded inside an invoice_card message block. */
export interface InvoiceCardSnapshot {
  data: PartialInvoiceData;
  template: 'intuit' | 'custom' | 'luigi';
  theme: InvoiceTheme | null;
}
