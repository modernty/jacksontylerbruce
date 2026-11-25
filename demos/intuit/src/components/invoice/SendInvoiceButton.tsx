import React, { useCallback } from 'react';
import { useInvoiceContext } from '@/context/InvoiceContext';
import { useChatContext } from '@/context/ChatContext';

export function SendInvoiceButton() {
  const { state, dispatch: invoiceDispatch } = useInvoiceContext();
  const { sendMessage } = useChatContext();

  const handlePress = useCallback(() => {
    // Mark sent first so the button disappears immediately across all messages
    invoiceDispatch({ type: 'MARK_SENT' });
    // Inject the fixed user message that triggers Claude's send confirmation
    sendMessage('Send invoice with Intuit.');
  }, [invoiceDispatch, sendMessage]);

  if (state.pathway !== 'intuit') return null;

  return (
    <div className="px-4 py-2.5">
      <button
        onClick={handlePress}
        data-demo="send-invoice"
        className="w-full h-[44px] rounded-xl flex items-center justify-center text-white text-[14px] font-semibold bg-intuit transition-opacity hover:opacity-90 active:opacity-75"
      >
        Send invoice with Intuit
      </button>
    </div>
  );
}
