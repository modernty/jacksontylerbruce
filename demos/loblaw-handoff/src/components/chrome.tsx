import Link from "next/link";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, type Status } from "@/lib/content";
import { BrandLockup } from "./lockup";

/**
 * Status reads as a state of the work, so only two treatments carry colour: the one
 * that means finished, and the one that means stop. Everything between is neutral,
 * which keeps the index from lighting up like a dashboard.
 */
const STATUS_STYLE: Record<Status, string> = {
  shipped: "border-transparent bg-[color:var(--ok)] text-white",
  "design-complete": "border-[color:var(--ok)]/35 text-[color:var(--ok)] bg-[color:var(--ok)]/8",
  "in-review": "border-rule-strong text-ink-2",
  "in-progress": "border-rule-strong text-ink-2",
  discovery: "border-rule text-ink-3",
  // A superseded spec stays readable and stays linked; the rule through it is the
  // only thing that says it is no longer current.
  superseded: "border-rule text-ink-4 line-through decoration-1",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-[3px] text-[13px] font-medium",
        STATUS_STYLE[status],
        className
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * A count with its unit. Mono is reserved for the number, which is the part a reader
 * scans for; the unit stays in the text face so the pair reads as a phrase.
 */
export function Count({
  value,
  unit,
  tone = "neutral",
}: {
  value: number | string;
  unit: string;
  tone?: "neutral" | "measure" | "flag";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 text-[13px]",
        tone === "neutral" && "text-ink-3",
        tone === "measure" && "text-measure",
        tone === "flag" && "text-flag"
      )}
    >
      <span className="literal text-[12px]">{value}</span>
      {unit}
    </span>
  );
}

/**
 * The bar's home link: the studio lockup, then the site's own name. Deliberately not a
 * product name after it — Remedy and PC Chat are still unsettled.
 */
export function Lockup({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 transition-opacity hover:opacity-70"
      aria-label="LCA and Loblaw Digital — Handoff, home"
    >
      <BrandLockup className={compact ? "text-[15px]" : "text-[19px]"} />
      <span aria-hidden className="text-rule-strong">
        /
      </span>
      <span aria-hidden className={cn("display text-ink", compact ? "text-[18px]" : "text-[24px]")}>
        Handoff
      </span>
    </Link>
  );
}

export function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-[color:var(--surface-80)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1480px] items-center gap-4 px-8">
        <Lockup compact />
        {children}
      </div>
    </header>
  );
}

export function Breadcrumb({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2.5 text-[13px]">
      {trail.map((crumb, i) => (
        <span key={crumb.label} className="flex min-w-0 items-center gap-2.5">
          {crumb.href ? (
            <Link href={crumb.href} className="truncate text-ink-3 transition-colors hover:text-ink">
              {crumb.label}
            </Link>
          ) : (
            <span className="truncate text-ink" aria-current="page">
              {crumb.label}
            </span>
          )}
          {i < trail.length - 1 && (
            <span aria-hidden className="text-rule-strong">
              ›
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

/**
 * Links out to Figma carry a corner-arrow glyph rather than a trailing "→": the
 * arrow is doing a job here — it says the destination is another application.
 */
export function FigmaLink({ href, label = "Open in Figma" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex shrink-0 items-center gap-2 border-b border-rule-strong pb-0.5 text-[14px] text-ink-2 transition-colors hover:border-ink hover:text-ink"
    >
      {label}
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="size-[11px] shrink-0 -translate-y-px opacity-55 transition-opacity group-hover:opacity-100"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" />
      </svg>
    </a>
  );
}

/**
 * A section heading that sits on its own dimension line — the rule runs out to the
 * edge of the block, and any count sits at the end of it, the way a measurement is
 * written on a drawing.
 */
export function SectionHeading({
  children,
  count,
  unit,
}: {
  children: React.ReactNode;
  count?: number;
  unit?: string;
}) {
  return (
    <div className="measured mb-5">
      <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-ink">{children}</h2>
      {count !== undefined && (
        <span className="literal order-3 shrink-0 text-ink-4">
          {count}
          {unit ? ` ${unit}` : ""}
        </span>
      )}
    </div>
  );
}
