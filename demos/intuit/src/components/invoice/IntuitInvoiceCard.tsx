import React from 'react';
import { PartialInvoiceData } from '@/types/invoice';
import { computeTotal } from '@/context/InvoiceContext';
import { InvoiceField } from './InvoiceField';

function IntuitLogo() {
  return (
    <svg width="90" height="18" viewBox="0 0 90 18" fill="none">
      <path
        d="M45.9555 10.4174C45.9555 14.7978 49.5865 18 54.2015 18C58.8164 18 62.4544 14.7978 62.4544 10.4174V0.353485H57.9849V9.89757C57.9849 12.2611 56.3496 13.8552 54.1876 13.8552C52.0257 13.8552 50.3903 12.268 50.3903 9.89757V0.353485H45.9209L45.9486 10.4174H45.9555ZM74.3867 4.38044H79.7154V17.6742H84.1848V4.38044H89.5135V0.346554H74.3867V4.38044V4.38044ZM71.4972 0.346554H67.0277V17.6742H71.4972V0.346554ZM27.9045 4.38044H33.2332V17.6742H37.7027V4.38044H43.0313V0.346554H27.9045V4.38044ZM4.46944 0.346554H0V17.6742H4.46944V0.346554ZM25.5555 7.58259C25.5555 3.20216 21.9176 0 17.3026 0C12.6877 0 9.05668 3.20216 9.05668 7.58259V17.6742H13.5261V8.12322C13.5261 5.75972 15.1614 4.16558 17.3234 4.16558C19.4854 4.16558 21.1207 5.75279 21.1207 8.12322V17.6673H25.5901L25.5624 7.57566L25.5555 7.58259Z"
        fill="#236CFF"
      />
    </svg>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold text-icon tracking-[1px] uppercase mb-1">{children}</p>
  );
}

function Hairline() {
  return <div className="h-px bg-divider my-3" />;
}

interface Props {
  data: PartialInvoiceData;
}

export function IntuitInvoiceCard({ data }: Props) {
  const total = computeTotal(data);

  const formatTotal = () => {
    if (total === 0) return undefined;
    return `$${total.toFixed(2)}`;
  };

  return (
    <div className="mx-4 my-2 bg-white rounded-xl px-5 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-[#F0F0F0]">
      {/* Intuit Header */}
      <div className="flex justify-center mb-3.5">
        <IntuitLogo />
      </div>
      <Hairline />

      {/* Invoice meta */}
      <div className="mb-3.5 flex flex-col gap-1">
        <p className="text-[14px] font-semibold text-ai-text">
          Invoice #{data.invoiceNumber ?? '001'}
        </p>
        <InvoiceField value={data.senderName} placeholder="Your name / Business name" placeholderWidth={160} className="text-[13px] leading-[19px]" />
        <InvoiceField value={data.senderEmail} placeholder="Business email" placeholderWidth={140} className="text-[13px] leading-[19px]" />
      </div>

      {/* Dates */}
      <div className="flex gap-6 mb-3.5">
        <div className="flex-1">
          <SectionLabel>INVOICE DATE</SectionLabel>
          <InvoiceField value={data.invoiceDate} placeholder="MM/DD/YYYY" className="text-[13px]" />
        </div>
        <div className="flex-1">
          <SectionLabel>DUE DATE</SectionLabel>
          <InvoiceField value={data.dueDate} placeholder="MM/DD/YYYY" className="text-[13px]" />
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-3.5 flex flex-col gap-1">
        <SectionLabel>BILL TO</SectionLabel>
        <InvoiceField value={data.clientName} placeholder="Client Name / Company Name" placeholderWidth={160} className="text-[13px] leading-[19px]" />
        <InvoiceField value={data.clientEmail} placeholder="Client Email" placeholderWidth={130} className="text-[13px] leading-[19px]" />
      </div>

      {/* Services */}
      <div className="mb-0 flex flex-col gap-1">
        <SectionLabel>SERVICES</SectionLabel>
        {data.services && data.services.length > 0 ? (
          data.services.map((svc, i) => (
            <div key={i} className="flex justify-between items-center py-1">
              <span className="text-[13px] text-ai-text flex-1">{svc.description}</span>
              <span className="text-[13px] text-ai-text font-medium">${svc.amount.toFixed(2)}</span>
            </div>
          ))
        ) : (
          <div className="flex justify-between items-center py-1">
            <InvoiceField placeholder="Service description" className="text-[13px] flex-1" />
            <InvoiceField placeholder="Amount" className="text-[13px]" />
          </div>
        )}
      </div>

      {/* Total */}
      <Hairline />
      <div className="flex justify-between items-center mb-3.5">
        <span className="text-[14px] font-semibold text-ai-text">Total</span>
        <InvoiceField value={formatTotal()} placeholder="Amount" className="text-[14px] font-semibold" />
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-icon leading-[18px]">
          Fast and free payments supported – credit card and ACH transfer accepted.
        </p>
        <div className="flex flex-col gap-1">
          <SectionLabel>NOTE TO CUSTOMER</SectionLabel>
          <p className="text-[12px] text-ai-text leading-[18px]">
            {data.note || (
              <span className="text-placeholder italic">Thank you for your business!</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
