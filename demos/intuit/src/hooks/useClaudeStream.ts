import { useCallback, useRef, useState } from 'react';
import { streamClaude } from '@/services/claude';
import { isAutoplay, scriptedTurn } from '@/demo/script';
import { StreamEvent } from '@/types/claude';
import { Message } from '@/types/message';

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY ?? '';

if (!API_KEY && !isAutoplay()) {
  console.error('[useClaudeStream] VITE_ANTHROPIC_API_KEY is not set. Add it to web/.env.local');
}

interface UseClaudeStreamResult {
  stream: (messages: Message[], onEvent: (event: StreamEvent) => void, onError?: (err: Error) => void) => Promise<void>;
  abort: () => void;
  isStreaming: boolean;
}

export function useClaudeStream(): UseClaudeStreamResult {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const stream = useCallback(
    async (messages: Message[], onEvent: (event: StreamEvent) => void, onError?: (err: Error) => void) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsStreaming(true);

      try {
        const source = isAutoplay()
          ? scriptedTurn(messages.filter((message) => message.role === 'user').length - 1, controller.signal)
          : streamClaude(messages, API_KEY, controller.signal);
        for await (const event of source) {
          if (controller.signal.aborted) break;
          onEvent(event);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[useClaudeStream] error:', err);
          onError?.(err as Error);
          onEvent({ type: 'message_stop' });
        }
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  return { stream, abort, isStreaming };
}
