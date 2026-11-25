import React, { useEffect, useRef, useCallback } from 'react';
import { useChatContext } from '@/context/ChatContext';
import { useVoiceContext } from '@/context/VoiceContext';
import { useInvoiceContext } from '@/context/InvoiceContext';
import { MessageRow } from './MessageRow';

// Total duration of the Intuit animation before content becomes visible:
// 3000ms (shimmer→badge) + ~450ms (typewriter) + 450ms (badge→invoice) ≈ 4000ms
const ANIMATION_DURATION_MS = 4200;

export function MessageList() {
  const { state } = useChatContext();
  const { isVoiceMode } = useVoiceContext();
  const { state: invoiceState } = useInvoiceContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll so bottomRef sits at the bottom of the viewport.
  // forceDown=false means we skip the scroll if it would move UP —
  // this prevents the shimmer-start from yanking the view upward.
  // smooth=true uses animated scrolling; keep it false during streaming
  // to avoid each token cancelling the previous smooth scroll animation.
  const scrollToBottom = useCallback((forceDown = false, smooth = false) => {
    const el = containerRef.current;
    const bottom = bottomRef.current;
    if (!el || !bottom) return;

    const elRect = el.getBoundingClientRect();
    const bottomRect = bottom.getBoundingClientRect();
    // Absolute position of bottomRef inside the scroll container
    const absoluteTop = bottomRect.top - elRect.top + el.scrollTop;
    const target = Math.max(0, absoluteTop - el.clientHeight);

    if (!forceDown && target < el.scrollTop) return; // never scroll up
    el.scrollTo({ top: target, behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  // Normal message-growth scroll (never goes up)
  useEffect(() => {
    scrollToBottom();
  }, [state.messages, scrollToBottom]);

  // When the invoice is marked complete, the Intuit animation may still be
  // running. Fire a scroll after the animation finishes so the send button
  // is pulled into view even when the AI response was faster than 4s.
  useEffect(() => {
    if (invoiceState.phase !== 'complete') return;
    const t = setTimeout(() => scrollToBottom(false, true), ANIMATION_DURATION_MS);
    return () => clearTimeout(t);
  }, [invoiceState.phase, scrollToBottom]);

  return (
    <div
      ref={containerRef}
      data-demo="messages"
      className="flex-1 overflow-y-auto min-h-0 pt-[80px] md:pt-4"
    >
      {state.messages.map((msg, i) => {
        const isFirstAiMessage = msg.role === 'assistant' &&
          state.messages.findIndex(m => m.role === 'assistant') === i;
        return (
          <MessageRow
            key={msg.id}
            message={msg}
            isLast={i === state.messages.length - 1}
            isFirstAiMessage={isFirstAiMessage}
          />
        );
      })}
      {isVoiceMode && <div aria-hidden="true" style={{ height: 120 }} />}
      <div ref={bottomRef} />
    </div>
  );
}
