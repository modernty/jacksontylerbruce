"use client";

// Vendored from assistant-ui elements (elements-thinking-indicator). Colours changed to the ink tokens:
// the dot takes the accent, the label and the elapsed time the placeholder ink.

import type { ComponentProps } from "react";
import { cn } from "@/src/lib/utils";
import { mono, ShimmerLabel } from "./surfaces";

export function ThinkingIndicator({
  label,
  elapsed,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "label" | "elapsed"> & {
  label: string;
  elapsed?: string;
}) {
  return (
    <div
      data-slot="thinking-indicator"
      className={cn(
        "flex items-center gap-2.5 text-sm text-[color:var(--ink-placeholder)]",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 animate-pulse rounded-full bg-[var(--accent)] motion-reduce:animate-none"
      />
      <ShimmerLabel
        key={label}
        className="fade-in slide-in-from-bottom-1 animate-in relative inline-block min-w-0 truncate leading-tight duration-300"
      >
        {label}
      </ShimmerLabel>
      {elapsed !== undefined && (
        <span className={cn(mono, "shrink-0 tabular-nums")}>{elapsed}</span>
      )}
    </div>
  );
}
