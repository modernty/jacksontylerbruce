import React from 'react';

interface Props {
  text: string;
  isStreaming: boolean;
}

export function StreamingText({ text, isStreaming }: Props) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <span className="text-[15px] leading-[1.5] text-ai-text whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
      {isStreaming && (
        <span className="inline-block w-[2px] h-[15px] bg-ai-text ml-[1px] align-middle animate-blink" />
      )}
    </span>
  );
}
