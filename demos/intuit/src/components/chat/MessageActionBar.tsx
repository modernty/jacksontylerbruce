import React, { useState } from 'react';

interface Props {
  text: string;
  showSources?: boolean;
}

export function MessageActionBar({ text, showSources = false }: Props) {
  const [copied, setCopied] = useState(false);
  const [thumbsUp, setThumbsUp] = useState(false);
  const [thumbsDown, setThumbsDown] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 mt-2 ml-0">
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md hover:bg-input-bg transition-colors text-icon"
        title={copied ? 'Copied!' : 'Copy'}
      >
        {copied ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>

      <button
        onClick={() => { setThumbsUp(v => !v); setThumbsDown(false); }}
        className={`p-1.5 rounded-md hover:bg-input-bg transition-colors ${thumbsUp ? 'text-ai-text' : 'text-icon'}`}
        title="Good response"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill={thumbsUp ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
      </button>

      <button
        onClick={() => { setThumbsDown(v => !v); setThumbsUp(false); }}
        className={`p-1.5 rounded-md hover:bg-input-bg transition-colors ${thumbsDown ? 'text-ai-text' : 'text-icon'}`}
        title="Bad response"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill={thumbsDown ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
          <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
        </svg>
      </button>

      {showSources && (
        <div className="flex items-center" style={{ marginLeft: 16 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <rect width="16" height="16" rx="8" fill="#236CFF"/>
            <path d="M9.20787 3.37891H6.79199V12.6209H9.20787V3.37891Z" fill="white"/>
          </svg>
          <span style={{ marginLeft: 8, fontSize: 12, lineHeight: '20px', color: '#374151' }}>
            Sources
          </span>
        </div>
      )}
    </div>
  );
}
