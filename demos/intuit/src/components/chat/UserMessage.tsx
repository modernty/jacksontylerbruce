import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Message } from '@/types/message';

const PdfThumbnail = lazy(() => import('./PdfThumbnail').then(m => ({ default: m.PdfThumbnail })));

interface Props {
  message: Message;
}

function stripExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}

export function UserMessage({ message }: Props) {
  const [visible, setVisible] = useState(!message.isVoice);
  useEffect(() => {
    if (!message.isVoice) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [message.isVoice]);
  const text = message.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { type: 'text'; text: string }).text)
    .join('')
    .trim();

  const attachments = message.content.filter((c) => c.type === 'image') as Array<{
    type: 'image';
    name: string;
    mimeType: string;
    base64: string;
  }>;

  if (!text && attachments.length === 0) return null;

  return (
    <div
      className="flex justify-end px-5 py-2"
      style={message.isVoice ? {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.4s ease-out, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
      } : undefined}
    >
      <div className="max-w-[80%] flex flex-col items-end gap-2">

        {/* Attachment previews — above the text bubble */}
        {attachments.map((att, i) => {
          const isImage = att.mimeType.startsWith('image/');
          const isPdf = att.mimeType === 'application/pdf';

          if (isImage) {
            return (
              <img
                key={i}
                src={`data:${att.mimeType};base64,${att.base64}`}
                alt={att.name}
                className="block rounded-2xl"
                style={{ maxWidth: 200 }}
              />
            );
          }

          if (isPdf) {
            return (
              <div key={i} className="rounded-2xl overflow-hidden bg-white" style={{ width: 200 }}>
                <Suspense fallback={<div style={{ width: 200, height: 120 }} className="bg-gray-100 animate-pulse" />}>
                  <PdfThumbnail base64={att.base64} />
                </Suspense>
                {/* Filename footer */}
                <div className="px-3 py-2">
                  <p className="text-[12px] text-[#6B7280] truncate">{stripExtension(att.name)}</p>
                </div>
              </div>
            );
          }

          // Fallback for other file types
          return (
            <div
              key={i}
              className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm px-3 py-3 w-full flex-shrink-0"
            >
              <p className="text-[12px] font-medium text-[#111827] truncate">{att.name}</p>
            </div>
          );
        })}

        {/* Text bubble */}
        {text && (
          <div className="bg-user-bubble rounded-[18px] px-4 py-2.5 w-full">
            {message.isVoice ? (
              <p className="text-[15px] leading-[1.5] text-ai-text whitespace-pre-wrap italic">&ldquo;{text}&rdquo;</p>
            ) : (
              <p className="text-[15px] leading-[1.25] text-ai-text whitespace-pre-wrap">{text}</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
