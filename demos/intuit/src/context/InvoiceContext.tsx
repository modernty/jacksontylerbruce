import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useReducer,
} from 'react';
import { InvoiceData, InvoicePathway, InvoiceTheme, PartialInvoiceData } from '@/types/invoice';

interface InvoiceState {
  pathway: InvoicePathway;
  data: PartialInvoiceData;
  phase: 'idle' | 'collecting' | 'complete' | 'sent' | 'paid' | 'deposit-paid';
  template: 'intuit' | 'custom' | 'luigi';
  theme: InvoiceTheme | null;
}

const initialState: InvoiceState = {
  pathway: null,
  data: {},
  phase: 'idle',
  template: 'intuit',
  theme: null,
};

type InvoiceAction =
  | { type: 'SELECT_PATHWAY'; pathway: InvoicePathway }
  | { type: 'UPDATE_FIELDS'; fields: PartialInvoiceData }
  | { type: 'SET_COMPLETE' }
  | { type: 'MARK_SENT' }
  | { type: 'MARK_PAID' }
  | { type: 'MARK_DEPOSIT_PAID' }
  | { type: 'SET_TEMPLATE'; template: 'intuit' | 'custom' | 'luigi' }
  | { type: 'SET_THEME'; theme: InvoiceTheme }
  | { type: 'RESET' };

function invoiceReducer(state: InvoiceState, action: InvoiceAction): InvoiceState {
  switch (action.type) {
    case 'SELECT_PATHWAY':
      return { ...state, pathway: action.pathway, phase: 'collecting' };
    case 'UPDATE_FIELDS':
      return { ...state, data: { ...state.data, ...action.fields } };
    case 'SET_COMPLETE':
      return { ...state, phase: 'complete' };
    case 'MARK_SENT':
      return { ...state, phase: 'sent' };
    case 'MARK_PAID':
      return { ...state, phase: 'paid' };
    case 'MARK_DEPOSIT_PAID':
      return { ...state, phase: 'deposit-paid' };
    case 'SET_TEMPLATE':
      return { ...state, template: action.template };
    case 'SET_THEME':
      return { ...state, theme: action.theme };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface InvoiceContextValue {
  state: InvoiceState;
  dispatch: React.Dispatch<InvoiceAction>;
  allRequiredFieldsFilled: () => boolean;
}

const InvoiceContext = createContext<InvoiceContextValue | null>(null);

export function InvoiceProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(invoiceReducer, initialState);

  const allRequiredFieldsFilled = useCallback(() => {
    const { data } = state;
    return !!(
      data.clientName?.trim() &&
      data.clientEmail?.trim() &&
      data.senderName?.trim() &&
      data.services &&
      data.services.length > 0 &&
      data.services[0].amount > 0
    );
  }, [state]);

  return (
    <InvoiceContext.Provider value={{ state, dispatch, allRequiredFieldsFilled }}>
      {children}
    </InvoiceContext.Provider>
  );
}

export function useInvoiceContext(): InvoiceContextValue {
  const ctx = useContext(InvoiceContext);
  if (!ctx) throw new Error('useInvoiceContext must be used within InvoiceProvider');
  return ctx;
}

export function computeTotal(data: PartialInvoiceData): number {
  return (data.services ?? []).reduce((sum, s) => sum + (s.amount ?? 0), 0);
}

export function todayFormatted(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

export function thirtyDaysFormatted(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}
