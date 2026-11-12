"use client";

// Vendored from assistant-ui elements (elements-image-generation), cut down to the dot grid alone:
// no surface, no stroke, no gradient, size label or caption. It holds the place of an image that has
// not arrived, and fades out when it does. Dots are ink at low strength and pulse in a diagonal wave.

import type { ComponentProps } from "react";
import { cn } from "@/src/lib/utils";

const COLUMNS = 10;

export function ImageGeneration({
  generating,
  ratio = 1,
  className,
  style,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  generating: boolean;
  /** Width over height of the image being held, so the grid keeps its shape. */
  ratio?: number;
}) {
  const rows = Math.min(16, Math.max(3, Math.round(COLUMNS / ratio)));
  const dots = Array.from({ length: COLUMNS * rows }, (_, i) => i);
  return (
    <div
      data-slot="image-generation"
      aria-hidden
      className={cn(
        "pointer-events-none grid place-items-center p-6 transition-opacity duration-500 motion-reduce:transition-none",
        generating ? "opacity-100" : "opacity-0",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`, ...style }}
      {...props}
    >
      {dots.map((dot) => {
        const row = Math.floor(dot / COLUMNS);
        const col = dot % COLUMNS;
        return (
          <span
            key={dot}
            className="size-1 rounded-full bg-[color-mix(in_srgb,var(--ink)_22%,transparent)] animate-pulse motion-reduce:animate-none"
            style={{ animationDelay: `${(row + col) * 90}ms` }}
          />
        );
      })}
    </div>
  );
}
