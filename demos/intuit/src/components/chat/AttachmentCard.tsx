import React, { useState, useCallback } from 'react';
import { UploadedFile } from '@/context/ChatContext';

interface Props {
  attachment: UploadedFile;
  onRemove: () => void;
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType === 'image/jpeg') return 'JPEG';
  if (mimeType === 'image/png') return 'PNG';
  if (mimeType === 'image/heic' || mimeType === 'image/heif') return 'HEIC';
  if (mimeType === 'image/webp') return 'WEBP';
  if (mimeType.startsWith('image/')) return 'IMAGE';
  return 'FILE';
}

function stripExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}

function CloseButton({ onRemove }: { onRemove: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onRemove}
      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors flex-shrink-0"
      title="Remove"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-[#9CA3AF]">
        <line x1="1" y1="1" x2="9" y2="9" />
        <line x1="9" y1="1" x2="1" y2="9" />
      </svg>
    </button>
  );
}

export function AttachmentCard({ attachment, onRemove }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const isImage = attachment.mimeType.startsWith('image/');
  const displayName = stripExtension(attachment.name);

  const openPreview = useCallback(() => {
    if (isImage) {
      setPreviewOpen(true);
    } else {
      const bytes = atob(attachment.base64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: attachment.mimeType });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  }, [attachment, isImage]);

  return (
    <>
      {/* Card */}
      <div
        onClick={openPreview}
        className="relative bg-white rounded-2xl border border-[#E5E7EB] shadow-sm w-[120px] h-[128px] overflow-hidden cursor-pointer select-none flex-shrink-0"
      >
        {isImage ? (
          <>
            {/* Full-bleed image thumbnail */}
            <img
              src={`data:${attachment.mimeType};base64,${attachment.base64}`}
              alt={attachment.name}
              className="w-full h-full object-cover"
            />
            {/* Close button overlaid */}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-black/50"
              title="Remove"
            >
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="9" y2="9" />
                <line x1="9" y1="1" x2="1" y2="9" />
              </svg>
            </button>
          </>
        ) : (
          /* PDF / other — type label, close button, filename. No icon. */
          <div className="px-3 pt-2.5 pb-3 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#9CA3AF] tracking-wide uppercase leading-none">
                {getFileTypeLabel(attachment.mimeType)}
              </span>
              <CloseButton onRemove={(e) => { e.stopPropagation(); onRemove(); }} />
            </div>
            <p className="text-[12px] font-normal text-[#111827] leading-snug line-clamp-3 break-words">
              {displayName}
            </p>
          </div>
        )}
      </div>

      {/* Full-screen image preview modal */}
      {previewOpen && isImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewOpen(false)}
        >
          <div className="relative max-w-[90vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={`data:${attachment.mimeType};base64,${attachment.base64}`}
              alt={attachment.name}
              className="rounded-2xl object-contain max-w-full max-h-[85vh] shadow-xl"
            />
            <button
              onClick={() => setPreviewOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="11" y2="11" />
                <line x1="11" y1="1" x2="1" y2="11" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
