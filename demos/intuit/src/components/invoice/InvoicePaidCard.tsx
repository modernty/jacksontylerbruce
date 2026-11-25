import React from 'react';
import { useInvoiceContext, computeTotal } from '@/context/InvoiceContext';
import paidBg from '@/assets/invoice-paid-bg.png';

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.08333 3.33331L13.75 7.99997L9.08333 12.6666M2.25 7.99997L13.3333 7.99998" stroke="white" strokeWidth="1.5"/>
    </svg>
  );
}

interface InvoicePaidCardProps {
  onClick?: () => void;
}

export function InvoicePaidCard({ onClick }: InvoicePaidCardProps = {}) {
  const { state } = useInvoiceContext();
  const { data, phase } = state;
  const total = computeTotal(data);
  const clientName = data.clientName ?? 'Your client';
  const isDepositPaid = phase === 'deposit-paid';

  // Format as "6,500.00"
  const whole = Math.floor(total);
  const cents = String(Math.round((total - whole) * 100)).padStart(2, '0');
  const formattedWhole = whole.toLocaleString('en-US');

  const interactive = !!onClick;
  const RootTag = interactive ? 'button' : 'div';

  return (
    <RootTag
      type={interactive ? ('button' as const) : undefined}
      onClick={onClick}
      className={`relative mx-4 my-2 rounded-xl overflow-hidden block w-[calc(100%-2rem)] text-left ${interactive ? 'hover:opacity-95 active:opacity-85 transition-opacity cursor-pointer' : ''}`}
      style={{ boxShadow: '0 1px 4px 0 rgba(0, 0, 0, 0.20)', border: 'none', padding: 0 }}
    >
      {/* Full-bleed background image — scaled slightly so the source PNG's
          baked-in whitespace pushes past the card edge and gets cropped by
          overflow:hidden. Replace the asset with a margin-less export and
          you can drop the transform. */}
      <img
        src={paidBg}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          transform: 'scale(1.1)',
          transformOrigin: 'center',
          zIndex: 0,
        }}
      />

      {/* Foreground content */}
      <div className="relative z-10 p-4 flex flex-col gap-3">
        {/* Heading — switches to "Deposit paid by …" when phase === 'deposit-paid' */}
        <p className="text-[15px] font-medium text-white">
          {isDepositPaid ? 'Deposit paid by ' : 'Invoice paid by '}
          {clientName}
        </p>

        {/* Amount row + arrow button */}
        <div className="flex items-center justify-between">
          {/* Amount block with eyebrow */}
          <div className="flex flex-col gap-1">
            <span
              className="text-[11px] font-semibold tracking-[1.4px] uppercase"
              style={{ color: 'rgba(255, 255, 255, 0.75)' }}
            >
              Amount Received
            </span>
            <div className="flex items-start leading-none">
              <span
                className="text-[22px] text-white mt-[6px] mr-[1px]"
                style={{ fontFamily: "'Avenir Next', 'Avenir', sans-serif", fontWeight: 600 }}
              >
                $
              </span>
              <span
                className="text-[36px] text-white leading-[1]"
                style={{ fontFamily: "'Avenir Next', 'Avenir', sans-serif", fontWeight: 600 }}
              >
                {formattedWhole}.{cents}
              </span>
            </div>
          </div>

          {/* 40×40 arrow indicator — always decorative now; the card itself
              becomes the click target when an onClick is provided. */}
          <span
            aria-hidden="true"
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              background: 'rgba(255, 255, 255, 0.15)',
            }}
          >
            <ArrowRight />
          </span>
        </div>
      </div>
    </RootTag>
  );
}
