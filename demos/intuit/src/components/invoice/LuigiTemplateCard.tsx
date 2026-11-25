import React, { useState, useEffect } from 'react';
import { computeTotal } from '@/context/InvoiceContext';
import { PartialInvoiceData, InvoiceTheme, DEFAULT_THEME } from '@/types/invoice';

const SECTION_BORDER = 'rgba(229, 57, 53, 0.20)';

function SectionPanel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 16, border: `1px solid ${SECTION_BORDER}`, borderRadius: 12 }}>
      {children}
    </div>
  );
}

function SectionLabel({ children, accent }: { children: string; accent: string }) {
  return (
    <p className="text-[10px] font-semibold tracking-[1.2px] uppercase mb-2" style={{ color: accent }}>
      {children}
    </p>
  );
}

function Divider({ color = '#E5E7EB', opacity = 1 }: { color?: string; opacity?: number }) {
  return <div className="h-px my-2" style={{ backgroundColor: color, opacity }} />;
}

function isDueToday(dueDate?: string): boolean {
  if (!dueDate) return false;
  const today = new Date();
  const fmt = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
  return dueDate === fmt;
}

interface Props {
  data: PartialInvoiceData;
  theme: InvoiceTheme | null;
}

export function LuigiTemplateCard({ data, theme: themeProp }: Props) {
  const theme: InvoiceTheme = themeProp ?? DEFAULT_THEME;
  const total = computeTotal(data);
  const depositAmount = data.depositPercent ? total * (data.depositPercent / 100) : null;

  const fmtMoney = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="mx-4 my-2 bg-white rounded-2xl px-4 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.07)] border border-[#EBEBEB]"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        fontFamily: '-apple-system, "SF Pro Text", "SF Pro Display", sans-serif',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease-out, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* ── Header ── */}
      <SectionPanel>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-[20px] font-semibold leading-tight truncate"
              style={{ color: theme.accent, fontFamily: '"Libre Baskerville", serif' }}
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
              <p
                className="text-[12px] mt-0.5"
                style={{ color: isDueToday(data.dueDate) ? theme.accent : '#6B7280' }}
              >
                {isDueToday(data.dueDate) ? 'Due Today' : `Due ${data.dueDate}`}
              </p>
            )}
          </div>
        </div>
      </SectionPanel>

      {/* ── Client ── */}
      <SectionPanel>
        <SectionLabel accent={theme.accent}>Client</SectionLabel>
        <p className="text-[14px] font-semibold text-[#111827]">
          {data.clientName || '—'}
        </p>
        {data.clientEmail && (
          <p className="text-[13px] text-[#374151] mt-0.5">{data.clientEmail}</p>
        )}
      </SectionPanel>

      {/* ── Services ── */}
      <SectionPanel>
        <SectionLabel accent={theme.accent}>Services</SectionLabel>
        <Divider color={theme.accent} opacity={0.13} />

        {data.services && data.services.length > 0 ? (
          data.services.map((svc, i) => (
            <React.Fragment key={i}>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-[14px] font-medium text-[#111827] flex-1 pr-4">
                  {svc.description}
                </span>
                <span className="text-[14px] text-[#374151] shrink-0">
                  ${svc.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
              {i < data.services!.length - 1 && <Divider color={theme.accent} opacity={0.13} />}
            </React.Fragment>
          ))
        ) : (
          <div className="flex justify-between items-center py-1.5">
            <span className="text-[14px] text-[#9CA3AF] italic">Service description</span>
            <span className="text-[14px] text-[#9CA3AF]">—</span>
          </div>
        )}

        {/* Total */}
        <div className="h-px bg-[#E5E7EB] mt-2 mb-1" />
        <div className="flex justify-between items-center pt-1">
          <span className="text-[15px] font-semibold text-[#111827]">Total</span>
          <span className="text-[15px] font-semibold text-[#111827]">
            {total > 0 ? fmtMoney(total) : '—'}
          </span>
        </div>

        {/* Deposit */}
        {depositAmount !== null && (
          <div className="flex justify-between items-center pt-1">
            <span className="text-[14px]" style={{ color: theme.accent }}>
              Initial Deposit of {data.depositPercent}%
            </span>
            <span className="text-[14px] font-medium" style={{ color: theme.accent }}>
              {fmtMoney(depositAmount)}
            </span>
          </div>
        )}
      </SectionPanel>

      {/* ── Footer ── */}
      <div className="text-center">
        <p className="text-[13px] text-[#6B7280]">
          {data.note || 'Thank you for your business!'}
        </p>
      </div>
    </div>
  );
}
