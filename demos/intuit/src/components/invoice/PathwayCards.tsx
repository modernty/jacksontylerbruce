import React from 'react';
import { useInvoiceFlow } from '@/hooks/useInvoiceFlow';

function IntuitLogo({ size = 22 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-[18%] bg-intuit flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="text-white font-semibold" style={{ fontSize: size * 0.65, lineHeight: 1 }}>i</span>
    </div>
  );
}

export function PathwayCards() {
  const { handlePathwaySelection } = useInvoiceFlow();

  return (
    <div className="px-4 py-2 flex flex-col gap-2.5">
      {/* PDF card */}
      <button
        onClick={() => handlePathwaySelection('pdf')}
        className="flex items-start gap-3 rounded-xl p-3.5 border border-divider bg-white hover:bg-[#FAFAFA] active:opacity-75 text-left transition-colors"
      >
        <div className="mt-0.5 flex-shrink-0 text-ai-text">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-ai-text mb-1">Create a PDF invoice</p>
          <p className="text-[13px] leading-[1.4] text-icon">
            I can generate a clean, professional invoice that you can download and send directly to your client.
          </p>
        </div>
      </button>

      {/* Intuit card */}
      <button
        onClick={() => handlePathwaySelection('intuit')}
        className="flex items-start gap-3 rounded-xl p-3.5 border-[1.5px] border-intuit bg-[#FAFBFF] hover:bg-[#F5F7FF] active:opacity-75 text-left transition-colors"
      >
        <div className="mt-0.5 flex-shrink-0">
          <IntuitLogo size={26} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-intuit mb-1">Invoice with Intuit</p>
          <p className="text-[13px] leading-[1.4] text-icon mb-2">
            Fast, free invoicing sent directly to your client — with built-in payment and tracking.
          </p>
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-1.5">
              <span className="text-[11px] text-intuit leading-[18px]">✦</span>
              <span className="text-[13px] text-ai-text leading-[18px]">Easy payment for your client</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-[11px] text-intuit leading-[18px]">✦</span>
              <span className="text-[13px] text-ai-text leading-[18px]">Instant money transfers</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-[11px] leading-[18px]">✅</span>
              <span className="text-[13px] text-ai-text leading-[18px]">Real-time status</span>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
