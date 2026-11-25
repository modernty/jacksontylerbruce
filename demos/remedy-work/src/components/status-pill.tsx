import { TONE_CLASS, toneFor } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * The uppercase status badge under a card title, as in the reference. Small, letterspaced
 * and tinted by tone rather than outlined, so a grid of cards reads as a status board at
 * a glance.
 */
export function StatusPill({ status }: { status: string }) {
  if (!status) return null;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-[6px] px-2 py-[5px]",
        "text-[11px]/[12px] font-semibold tracking-[0.08em] uppercase",
        TONE_CLASS[toneFor(status)],
      )}
    >
      {status}
    </span>
  );
}
