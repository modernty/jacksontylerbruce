import { InvoiceData } from '@/types/invoice';

export function buildInvoiceHTML(data: InvoiceData): string {
  const servicesRows = data.services
    .map(
      (s) => `
      <tr>
        <td class="service-name">${escapeHtml(s.description)}</td>
        <td class="service-amount">$${s.amount.toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const total = data.services.reduce((sum, s) => sum + s.amount, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1A1A1A;
      padding: 48px;
      max-width: 680px;
      margin: 0 auto;
    }
    .intuit-header { text-align: center; font-size: 22px; font-weight: 700; color: #236CFF; letter-spacing: 3px; margin-bottom: 20px; }
    .divider { border: none; border-top: 1px solid #E5E5E5; margin: 16px 0; }
    .invoice-number { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .meta-line { font-size: 13px; color: #555; line-height: 1.6; }
    .invoice-meta { margin-bottom: 20px; }
    .dates-row { display: flex; gap: 40px; margin-bottom: 20px; }
    .date-col label { display: block; font-size: 10px; font-weight: 600; color: #8E8E8E; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
    .date-col span { font-size: 13px; }
    .section-label { font-size: 10px; font-weight: 600; color: #8E8E8E; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
    .bill-to { margin-bottom: 20px; }
    .bill-name { font-size: 13px; font-weight: 500; }
    .bill-email { font-size: 13px; color: #555; }
    .services { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    .services th { text-align: left; font-size: 10px; font-weight: 600; color: #8E8E8E; letter-spacing: 1px; text-transform: uppercase; padding-bottom: 8px; border-bottom: 1px solid #E5E5E5; }
    .services th:last-child { text-align: right; }
    .services td { padding: 8px 0; font-size: 13px; border-bottom: 1px solid #F0F0F0; }
    .service-amount { text-align: right; font-weight: 500; }
    .total-row { display: flex; justify-content: space-between; padding: 12px 0 4px; font-size: 14px; font-weight: 700; }
    .footer { margin-top: 20px; }
    .footer-text { font-size: 11px; color: #8E8E8E; line-height: 1.6; }
    .note-label { font-size: 10px; font-weight: 600; color: #8E8E8E; letter-spacing: 1px; text-transform: uppercase; margin-top: 14px; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="intuit-header">INTUIT</div>
  <hr class="divider" />
  <div class="invoice-meta">
    <div class="invoice-number">Invoice #${escapeHtml(data.invoiceNumber)}</div>
    <div class="meta-line">${escapeHtml(data.senderName)}</div>
    <div class="meta-line">${escapeHtml(data.senderEmail)}</div>
  </div>
  <div class="dates-row">
    <div class="date-col"><label>Invoice Date</label><span>${escapeHtml(data.invoiceDate)}</span></div>
    <div class="date-col"><label>Due Date</label><span>${escapeHtml(data.dueDate)}</span></div>
  </div>
  <div class="bill-to">
    <div class="section-label">Bill To</div>
    <div class="bill-name">${escapeHtml(data.clientName)}</div>
    <div class="bill-email">${escapeHtml(data.clientEmail)}</div>
  </div>
  <div class="section-label">Services</div>
  <table class="services">
    <thead><tr><th>Description</th><th>Amount</th></tr></thead>
    <tbody>${servicesRows}</tbody>
  </table>
  <hr class="divider" />
  <div class="total-row"><span>Total</span><span>$${total.toFixed(2)}</span></div>
  <div class="footer">
    <div class="footer-text">Fast and free payments supported – credit card and ACH transfer accepted.</div>
    <div class="note-label">Note to Customer</div>
    <div class="footer-text">${escapeHtml(data.note || 'Thank you for your business!')}</div>
  </div>
</body>
</html>`;
}

export function printAndShare(data: InvoiceData): void {
  const html = buildInvoiceHTML(data);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();

  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 1000);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
