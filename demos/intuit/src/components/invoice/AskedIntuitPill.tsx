import React from 'react';
import { IntuitStatus } from '@/types/message';

const STATUS_LABELS: Record<IntuitStatus, string> = {
  asked: 'Contacting Intuit...',
  drafting: 'Draft invoice',
  ready: 'Invoice ready',
  complete: 'Invoice complete',
};

function IntuitBadge() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill="#236CFF" />
      <path d="M16.1138 5.91406H11.886V22.0876H16.1138V5.91406Z" fill="white" />
    </svg>
  );
}

interface Props {
  status: IntuitStatus;
}

export function AskedIntuitPill({ status }: Props) {
  return (
    <div className="px-4 pt-3 pb-2 flex flex-col gap-2">
      <span className="text-[13px] text-icon">Asked Intuit</span>
      <div className="flex items-center gap-2 self-start">
        <IntuitBadge />
        <span className="text-[15px] font-medium text-ai-text">Intuit</span>
      </div>
      <span className="text-[13px] text-ai-text">{STATUS_LABELS[status]}</span>
    </div>
  );
}
