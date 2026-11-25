import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useChatContext, UploadedFile } from '@/context/ChatContext';
import { useVoiceContext } from '@/context/VoiceContext';
import { AttachmentCard } from './AttachmentCard';

export function InputBar() {
  const { sendMessage, state, abortStream } = useChatContext();
  const { isVoiceMode, enterVoiceMode, exitVoiceMode } = useVoiceContext();
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Animation state
  const [showVoiceLayout, setShowVoiceLayout] = useState(false);
  const [pillIconsOpacity, setPillIconsOpacity] = useState(1);
  const [voiceButtonsOpacity, setVoiceButtonsOpacity] = useState(0);

  useEffect(() => {
    if (isVoiceMode) {
      // Phase 1: fade out mic + voice-bars inside pill
      setPillIconsOpacity(0);
      // Phase 2: expand voice buttons (pill shrinks), then fade them in
      setShowVoiceLayout(true);
      const t = setTimeout(() => setVoiceButtonsOpacity(1), 160);
      return () => clearTimeout(t);
    } else {
      // Phase 1: fade out voice buttons
      setVoiceButtonsOpacity(0);
      // Phase 2: collapse wrapper, restore pill icons
      const t = setTimeout(() => {
        setShowVoiceLayout(false);
        setPillIconsOpacity(1);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [isVoiceMode]);

  const hasText = text.trim().length > 0 || attachment !== null;
  const canSend = hasText && !state.isStreaming;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const msgText = text.trim();
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    const att = attachment;
    setAttachment(null);
    await sendMessage(msgText, att ?? undefined);
  }, [canSend, text, attachment, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttach = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setAttachment({ name: file.name, mimeType: file.type, base64 });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  return (
    <div className="flex-shrink-0 px-3 pb-[16px] md:pb-[32px] pt-2.5 md:pt-2 bg-white">
      <div className="flex items-end gap-2">

        {/* + button — always visible */}
        <button
          onClick={showVoiceLayout ? undefined : handleAttach}
          className="w-11 h-11 rounded-full bg-input-bg flex items-center justify-center hover:bg-[#E0E0E0] transition-colors flex-shrink-0"
          title="Attach file"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Pill — always flex-1, content switches between normal and voice */}
        <div className="flex-1 flex flex-col bg-input-bg rounded-3xl min-h-[44px]">
          {showVoiceLayout ? (
            <div className="flex items-center pl-4 min-h-[44px]">
              <span className="flex-1 text-[16px] text-placeholder">Ask ChatGPT</span>
            </div>
          ) : (
            <>
              {attachment && (
                <div className="px-3 pt-3 pb-1">
                  <AttachmentCard attachment={attachment} onRemove={() => setAttachment(null)} />
                </div>
              )}
              <div className="flex items-end pl-4 pr-[6px] min-h-[44px] gap-2">
                <textarea
                  data-demo="composer"
                  ref={textareaRef}
                  className="flex-1 bg-transparent text-[16px] text-ai-text placeholder:text-placeholder outline-none resize-none py-2.5 max-h-[120px] min-w-0"
                  placeholder="Ask ChatGPT"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  style={{ lineHeight: '1.375' }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                  }}
                />

                {/* Right side — wrapped in opacity for fade-out on voice entry */}
                <div
                  style={{ opacity: pillIconsOpacity, transition: 'opacity 0.18s ease' }}
                  className="flex items-center flex-shrink-0"
                >
                  {state.isStreaming ? (
                    <button
                      onClick={abortStream}
                      className="w-8 h-8 rounded-full bg-ai-text flex items-center justify-center mb-[6px]"
                      title="Stop"
                    >
                      <div className="w-[10px] h-[10px] bg-white rounded-[2px]" />
                    </button>
                  ) : hasText ? (
                    <button
                      onClick={handleSend}
                      data-demo="send"
                      disabled={!canSend}
                      className="w-8 h-8 rounded-full bg-ai-text flex items-center justify-center disabled:opacity-40 mb-[6px]"
                      title="Send"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                      </svg>
                    </button>
                  ) : (
                    <>
                      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 mb-[6px]">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-icon">
                          <path d="M7.5 17.5H12.5M15 8.125V9.375C15 12.125 12.75 14.375 10 14.375M10 14.375C7.25 14.375 5 12.125 5 9.375V8.125M10 14.375V17.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M9.99999 12.5C9.58751 12.4991 9.17942 12.4152 8.79996 12.2535C8.42049 12.0918 8.07739 11.8555 7.79101 11.5586C7.20475 10.9674 6.87556 10.1686 6.87499 9.33596V5.00002C6.87339 4.58919 6.95313 4.18211 7.10961 3.80225C7.26609 3.42238 7.49621 3.07725 7.78671 2.78674C8.07722 2.49624 8.42235 2.26612 8.80222 2.10964C9.18208 1.95316 9.58916 1.87342 9.99999 1.87502C11.7523 1.87502 13.125 3.24768 13.125 5.00002V9.33596C13.125 11.0805 11.723 12.5 9.99999 12.5Z" fill="currentColor"/>
                        </svg>
                      </div>
                      <button onClick={enterVoiceMode} className="w-8 h-8 rounded-full bg-ai-text flex items-center justify-center flex-shrink-0 mb-[6px]">
                        <div className="flex items-center gap-[2.5px]">
                          <div className="w-[3px] rounded-full bg-white" style={{ height: '5.83px' }} />
                          <div className="w-[3px] rounded-full bg-white" style={{ height: '11.67px' }} />
                          <div className="w-[3px] rounded-full bg-white" style={{ height: '2.91px' }} />
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Voice mode buttons — slide in by expanding width, then fade in */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflow: 'hidden',
            width: showVoiceLayout ? 96 : 0,
            transition: 'width 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
            flexShrink: 0,
          }}
        >
          {/* Mic button */}
          <button
            style={{
              opacity: voiceButtonsOpacity,
              transition: 'opacity 0.5s ease',
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: '50%',
              background: 'var(--color-input-bg, #F2F2F2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
            }}
            title="Microphone"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 17.5H12.5M15 8.125V9.375C15 12.125 12.75 14.375 10 14.375M10 14.375C7.25 14.375 5 12.125 5 9.375V8.125M10 14.375V17.5" stroke="#6B7280" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9.99999 12.5C9.58751 12.4991 9.17942 12.4152 8.79996 12.2535C8.42049 12.0918 8.07739 11.8555 7.79101 11.5586C7.20475 10.9674 6.87556 10.1686 6.87499 9.33596V5.00002C6.87339 4.58919 6.95313 4.18211 7.10961 3.80225C7.26609 3.42238 7.49621 3.07725 7.78671 2.78674C8.07722 2.49624 8.42235 2.26612 8.80222 2.10964C9.18208 1.95316 9.58916 1.87342 9.99999 1.87502C11.7523 1.87502 13.125 3.24768 13.125 5.00002V9.33596C13.125 11.0805 11.723 12.5 9.99999 12.5Z" fill="#6B7280"/>
            </svg>
          </button>

          {/* Exit voice button */}
          <button
            onClick={exitVoiceMode}
            style={{
              opacity: voiceButtonsOpacity,
              transition: 'opacity 0.5s ease',
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: '50%',
              background: 'var(--color-ai-text, #0D0D0D)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
            }}
            title="Exit voice mode"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 5L15 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
