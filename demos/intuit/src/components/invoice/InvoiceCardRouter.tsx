import React from 'react';
import { InvoiceCardSnapshot } from '@/types/invoice';
import { IntuitInvoiceCard } from './IntuitInvoiceCard';
import { CustomTemplateCard } from './CustomTemplateCard';
import { LuigiTemplateCard } from './LuigiTemplateCard';

interface Props {
  snapshot: InvoiceCardSnapshot;
}

export function InvoiceCardRouter({ snapshot }: Props) {
  if (snapshot.template === 'luigi') {
    return <LuigiTemplateCard data={snapshot.data} theme={snapshot.theme} />;
  }
  if (snapshot.template === 'custom') {
    return <CustomTemplateCard data={snapshot.data} theme={snapshot.theme} />;
  }
  return <IntuitInvoiceCard data={snapshot.data} />;
}
