"use client";

// Vendored from assistant-ui elements. Colours changed to the ink tokens: fresh words arrive as a light ink tint and settle to ink.

import type { ComponentProps, ReactNode } from "react";
import { CopyIcon, RefreshCwIcon } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { ghostButton, paper } from "./surfaces";
import { take } from "../utils/range";

export interface MessagePairProps extends Omit<
  ComponentProps<"div">,
  "children" | "onCopy"
> {
  userMessage: string;
  words: readonly string[];
  visibleWords: number;
  streaming: boolean;
  /** Fresh words arrive in placeholder ink and settle. Off, they arrive in their final colour. */
  tint?: boolean;
  variant?: "bubble" | "flat";
  onCopy?: () => void;
  onRegenerate?: () => void;
  /** Shown in place of the words once streaming ends, e.g. the same text with links in it. */
  final?: ReactNode;
  /** What is happening while the answer is on its way, e.g. "Thinking". Shown in place of the words. */
  status?: string;
}

export function MessagePair({
  userMessage,
  words,
  visibleWords,
  streaming,
  tint = true,
  variant = "bubble",
  onCopy,
  onRegenerate,
  final,
  status,
  className,
  ...props
}: MessagePairProps) {
  const shown = take(words, visibleWords);

  return (
    <div
      data-slot="message-pair"
      className={cn("flex w-full max-w-sm flex-col gap-5", className)}

      {...props}
    >
      <p
        className={cn(
          "max-w-[85%] self-end text-[15px] leading-[22px]",
          variant === "bubble"
            ? cn(paper, "rounded-2xl px-3.5 py-2")
            : "text-foreground/90 text-end",
        )}
      >
        {userMessage}
      </p>
      <div className="group/message flex flex-col items-start">
        {/* A div, not a p: a rendered answer can hold a list. */}
        {/* Room is held only while the answer is arriving, so what follows a finished answer sits close to it. */}
        <div className={cn("text-[15px] leading-relaxed", streaming && "min-h-[4.25rem]")}>
          {status ? (
            <span role="status" className="animate-pulse text-[color:var(--accent)] motion-reduce:animate-none">
              {status}
            </span>
          ) : !streaming && final ? final : shown.map((word, index) => {
            const fresh = tint && streaming && shown.length - 1 - index < 2;

            return (
              <span
                key={`${word}-${index}`}
                className="fade-in animate-in fill-mode-both duration-500 motion-reduce:animate-none"
              >
                <span
                  className={cn(
                    "transition-colors duration-700 motion-reduce:transition-none",
                    fresh && "text-[color:var(--ink-placeholder)]",
                  )}
                >
                  {word}
                </span>{" "}
              </span>
            );
          })}
          {streaming && !status && shown.length > 0 && (
            <span
              aria-hidden
              className="-mb-0.5 ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-[var(--accent)] motion-reduce:animate-none"
            />
          )}
        </div>
        {(onCopy || onRegenerate) && (
          <div className="flex items-center gap-1 pt-1 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100 motion-reduce:transition-none">
            {onCopy && (
              <button
                type="button"
                aria-label="Copy response"
                onClick={onCopy}
                className={cn(ghostButton, "size-7")}
              >
                <CopyIcon className="size-3.5" />
              </button>
            )}
            {onRegenerate && (
              <button
                type="button"
                aria-label="Regenerate response"
                onClick={onRegenerate}
                className={cn(ghostButton, "size-7")}
              >
                <RefreshCwIcon className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
