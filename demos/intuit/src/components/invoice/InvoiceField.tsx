import React from 'react';

interface Props {
  value?: string;
  placeholder?: string;
  className?: string;
  placeholderWidth?: number;
}

export function InvoiceField({ value, placeholder, className = '', placeholderWidth = 120 }: Props) {
  if (!value) {
    if (placeholder) {
      return (
        <span className={`text-[13px] text-placeholder italic ${className}`}>
          [{placeholder}]
        </span>
      );
    }
    return (
      <div
        className="h-[14px] rounded bg-[#E8E8E8] my-[2px]"
        style={{ width: placeholderWidth }}
      />
    );
  }

  return (
    <span className={`text-[14px] text-ai-text leading-5 animate-fade-in ${className}`}>
      {value}
    </span>
  );
}
