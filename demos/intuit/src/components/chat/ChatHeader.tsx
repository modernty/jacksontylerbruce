import React, { useEffect, useState } from 'react';
import { useChatContext } from '@/context/ChatContext';
import { useVoiceContext } from '@/context/VoiceContext';

export function ChatHeader() {
  const { clearChat, state } = useChatContext();
  const { isVoiceMode } = useVoiceContext();
  const [showVoiceLayout, setShowVoiceLayout] = useState(false);
  const [normalOpacity, setNormalOpacity] = useState(1);
  const [voiceTitleOpacity, setVoiceTitleOpacity] = useState(0);

  useEffect(() => {
    if (isVoiceMode) {
      // Fade out normal header content first
      setNormalOpacity(0);
      // After normal content fades, switch layout and fade in voice title
      const t = setTimeout(() => {
        setShowVoiceLayout(true);
        setTimeout(() => setVoiceTitleOpacity(1), 30);
      }, 200);
      return () => clearTimeout(t);
    } else {
      // Fade out voice title
      setVoiceTitleOpacity(0);
      // After it fades, switch back and restore normal content
      const t = setTimeout(() => {
        setShowVoiceLayout(false);
        setNormalOpacity(1);
      }, 220);
      return () => clearTimeout(t);
    }
  }, [isVoiceMode]);

  const handleClear = () => {
    if (state.messages.length === 0) return;
    if (window.confirm('Start a new chat? This will clear the current conversation.')) {
      clearChat();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 bg-white md:static md:flex-shrink-0" style={{ height: 64 }}>
      {showVoiceLayout ? (
        <div
          className="flex-1 flex items-center justify-center gap-1"
          style={{ opacity: voiceTitleOpacity, transition: 'opacity 0.5s ease' }}
        >
          <span className="text-[18px] font-semibold text-ai-text tracking-tight">ChatGPT</span>
          <span className="text-[18px] font-normal text-ai-text tracking-tight">Voice</span>
        </div>
      ) : (
        <div className="contents" style={{ opacity: normalOpacity, transition: 'opacity 0.18s ease' }}>
          {/* Left: menu icon + title */}
          <div className="flex items-center gap-3">
            <button style={{ width: 36, height: 36, flexShrink: 0 }} className="flex items-center justify-center hover:opacity-60 transition-opacity text-ai-text">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 15H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="text-[18px] font-semibold text-ai-text tracking-tight">ChatGPT</span>
          </div>

          {/* Right: compose + ellipsis */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleClear}
              className="w-9 h-9 flex items-center justify-center hover:opacity-60 transition-opacity text-ai-text"
              title="New chat"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_1174_10602)">
                  <path d="M9.16675 3.33203H3.33341C2.41294 3.33203 1.66675 4.07822 1.66675 4.9987V16.6654C1.66675 17.5858 2.41294 18.332 3.33341 18.332H15.0001C15.9206 18.332 16.6667 17.5858 16.6667 16.6654V10.832" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.4167 2.08417C16.1066 1.39428 17.2269 1.39428 17.9167 2.08417C18.6066 2.77407 18.6066 3.89428 17.9167 4.58417L10.0001 12.5008L6.66675 13.3342L7.50008 10.0008L15.4167 2.08417V2.08417" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
                <defs>
                  <clipPath id="clip0_1174_10602">
                    <rect width="20" height="20" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </button>
            <button className="w-9 h-9 flex items-center justify-center hover:opacity-60 transition-opacity text-ai-text">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.16675 10.0013C9.16675 10.4612 9.54015 10.8346 10.0001 10.8346C10.46 10.8346 10.8334 10.4612 10.8334 10.0013C10.8334 9.54137 10.46 9.16797 10.0001 9.16797C9.54015 9.16797 9.16675 9.54137 9.16675 10.0013V10.0013" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 10.0013C15 10.4612 15.3734 10.8346 15.8333 10.8346C16.2933 10.8346 16.6667 10.4612 16.6667 10.0013C16.6667 9.54137 16.2933 9.16797 15.8333 9.16797C15.3734 9.16797 15 9.54137 15 10.0013Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.33325 10.0013C3.33325 10.4612 3.70666 10.8346 4.16659 10.8346C4.62651 10.8346 4.99992 10.4612 4.99992 10.0013C4.99992 9.54137 4.62651 9.16797 4.16659 9.16797C3.70666 9.16797 3.33325 9.54137 3.33325 10.0013V10.0013" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
