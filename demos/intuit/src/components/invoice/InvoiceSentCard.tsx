import React from 'react';
import { useInvoiceContext, computeTotal } from '@/context/InvoiceContext';

export function InvoiceSentCard() {
  const { state } = useInvoiceContext();
  const { data } = state;
  const total = computeTotal(data);
  const clientName = data.clientName ?? 'Your client';

  // Format as "6,500.00"
  const whole = Math.floor(total);
  const cents = String(Math.round((total - whole) * 100)).padStart(2, '0');
  const formattedWhole = whole.toLocaleString('en-US');

  return (
    <div
      className="mx-4 my-2 bg-white rounded-xl p-4 flex flex-col gap-3"
      style={{ boxShadow: '0 1px 4px 0 rgba(0, 0, 0, 0.20)' }}
    >
      {/* Invoice sent to [client] */}
      <p className="text-[15px] font-medium text-[#111827]">
        Invoice sent to {clientName}
      </p>

      {/* Amount */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-[#9CA3AF] tracking-[1.4px] uppercase">
          Amount Requested
        </span>
        <div className="flex items-start leading-none">
          <span
            className="text-[22px] text-[#111827] mt-[6px] mr-[1px]"
            style={{ fontFamily: "'Avenir Next', 'Avenir', sans-serif", fontWeight: 600 }}
          >
            $
          </span>
          <span
            className="text-[36px] text-[#111827] leading-[1]"
            style={{ fontFamily: "'Avenir Next', 'Avenir', sans-serif", fontWeight: 600 }}
          >
            {formattedWhole}.{cents}
          </span>
        </div>
      </div>
    </div>
  );
}
