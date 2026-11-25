import { useCallback } from 'react';
import { useInvoiceContext } from '@/context/InvoiceContext';
import { useChatContext } from '@/context/ChatContext';
import { InvoicePathway } from '@/types/invoice';

export function useInvoiceFlow() {
  const { state: invoiceState, dispatch: invoiceDispatch } = useInvoiceContext();
  const { sendMessage } = useChatContext();

  const handlePathwaySelection = useCallback(
    (pathway: InvoicePathway) => {
      invoiceDispatch({ type: 'SELECT_PATHWAY', pathway });
      const label =
        pathway === 'intuit'
          ? "I'd like to use Intuit."
          : "I'd like to create a PDF invoice.";
      sendMessage(label);
    },
    [invoiceDispatch, sendMessage]
  );

  const handleSendInvoice = useCallback(async () => {
    if (invoiceState.pathway === 'intuit') {
      // Preview-only — real Intuit API goes here in the future
    }
  }, [invoiceState.pathway]);

  const handleReset = useCallback(() => {
    invoiceDispatch({ type: 'RESET' });
  }, [invoiceDispatch]);

  return { handlePathwaySelection, handleSendInvoice, handleReset };
}
