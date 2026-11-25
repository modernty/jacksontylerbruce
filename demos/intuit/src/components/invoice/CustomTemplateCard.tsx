import React, { useState, useEffect } from 'react';
import { computeTotal } from '@/context/InvoiceContext';
import { PartialInvoiceData, InvoiceTheme, DEFAULT_THEME } from '@/types/invoice';

function SectionPanel({
  children,
  theme,
  className = '',
}: {
  children: React.ReactNode;
  theme: InvoiceTheme;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-3.5 ${className}`}
      style={{ backgroundColor: theme.sectionBg }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold text-[#6B7280] tracking-[1.2px] uppercase mb-2">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="h-px bg-[#E5E7EB] my-2" />;
}

interface Props {
  data: PartialInvoiceData;
  theme: InvoiceTheme | null;
}

export function CustomTemplateCard({ data, theme: themeProp }: Props) {
  const theme: InvoiceTheme = themeProp ?? DEFAULT_THEME;
  const total = computeTotal(data);

  const fmt = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="mx-4 my-2 bg-white rounded-2xl px-4 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.07)] border border-[#EBEBEB] flex flex-col gap-3"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease-out, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* ── Header: sender + invoice meta ── */}
      <SectionPanel theme={theme}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-[18px] font-bold leading-tight truncate"
              style={{ color: theme.accent }}
            >
              {data.senderName || '—'}
            </p>
            {data.senderEmail && (
              <p className="text-[12px] text-[#6B7280] mt-0.5 truncate">{data.senderEmail}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[14px] font-semibold text-[#111827]">
              Invoice #{data.invoiceNumber ?? '001'}
            </p>
            {data.dueDate && (
              <p className="text-[12px] text-[#6B7280] mt-0.5">Due {data.dueDate}</p>
            )}
          </div>
        </div>
      </SectionPanel>

      {/* ── Client ── */}
      <SectionPanel theme={theme}>
        <SectionLabel>Client</SectionLabel>
        <p className="text-[14px] font-semibold text-[#111827]">
          {data.clientName || '—'}
        </p>
        {data.clientEmail && (
          <p className="text-[13px] text-[#374151] mt-0.5">{data.clientEmail}</p>
        )}
      </SectionPanel>

      {/* ── Services ── */}
      <SectionPanel theme={theme}>
        <SectionLabel>Services</SectionLabel>
        <Divider />

        {data.services && data.services.length > 0 ? (
          data.services.map((svc, i) => (
            <div key={i} className="flex justify-between items-center py-1.5">
              <span className="text-[14px] font-medium text-[#111827] flex-1 pr-4">
                {svc.description}
              </span>
              <span className="text-[14px] text-[#374151] shrink-0">
                {fmt(svc.amount)}
              </span>
            </div>
          ))
        ) : (
          <div className="flex justify-between items-center py-1.5">
            <span className="text-[14px] text-[#9CA3AF] italic">Service description</span>
            <span className="text-[14px] text-[#9CA3AF]">—</span>
          </div>
        )}

        <div className="h-px bg-[#E5E7EB] mt-2 mb-1" />
        <div className="flex justify-between items-center pt-1">
          <span className="text-[15px] font-bold" style={{ color: theme.accent }}>Total</span>
          <span className="text-[15px] font-bold" style={{ color: theme.accent }}>
            {total > 0 ? fmt(total) : '—'}
          </span>
        </div>
      </SectionPanel>

      {/* ── Footer ── */}
      <div className="px-1 text-center pt-1">
        <p className="text-[14px] font-bold text-[#111827]">
          {data.note || 'Thank you for your business!'}
        </p>
        <p className="text-[12px] text-[#6B7280] mt-1 leading-[18px]">
          Fast and free payments supported — credit card and ACH transfer accepted.
        </p>
      </div>
    </div>
  );
}
