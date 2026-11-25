"use client";

import { cn } from "@/lib/utils";
import { figmaUrl } from "@/lib/figma";
import type { NodeDetail } from "@/components/screens/describe";
import type { Constraint, LayerNode, TokenValue } from "@/lib/content";

/**
 * The layer readout, shared by the static stage and the running prototype. Given a node
 * it shows where the node sits, its geometry, and whatever style was extracted for it.
 *
 * It takes a `figmaFileKey` rather than a whole `Screen` because that is the only field
 * it ever needed — which is what lets the prototype, whose nodes span three screens,
 * reuse it unchanged.
 */
export function Inspector({
  node,
  byId,
  figmaFileKey,
  onSelect,
  detail,
  constraint,
}: {
  node: LayerNode;
  byId: Map<string, LayerNode>;
  figmaFileKey: string;
  /** Supplied where selection can move — makes the path the way back up. */
  onSelect?: (id: string) => void;
  /**
   * Resolved style for a rebuilt screen, read off the live DOM. When present it replaces
   * the extracted-style sections, because it is both richer and current: a text node
   * reports its type, a layout frame reports its gaps and sizing, and a frame that only
   * holds other layout frames says so.
   */
  detail?: NodeDetail;
  /** A documented limit on this node, when one applies. */
  constraint?: Constraint | null;
}) {
  // Walk up to the root so the header can show where this node sits.
  const trail: LayerNode[] = [];
  for (
    let cur: LayerNode | undefined = node;
    cur;
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
  ) {
    trail.unshift(cur);
  }

  const s = node.style;

  return (
    <div>
      <div className="border-b border-rule px-4 py-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h4 className="text-[15px] font-semibold text-ink">{node.name}</h4>
          <span className="literal rounded bg-measure/12 px-1.5 py-0.5 text-measure">
            {detail ? detail.role : node.asset ? node.asset.kind.toUpperCase() : node.type}
          </span>
        </div>

        <nav aria-label="Layer path" className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {trail.map((crumb, i) => {
            const isCurrent = i === trail.length - 1;
            const Crumb = onSelect && !isCurrent ? "button" : "span";

            return (
            <span key={crumb.id} className="flex items-center gap-1.5">
              <Crumb
                {...(onSelect && !isCurrent ? { onClick: () => onSelect(crumb.id) } : {})}
                className={cn(
                  "literal rounded px-1.5 py-0.5",
                  isCurrent
                    ? "bg-measure/12 text-measure"
                    : cn(
                        "bg-surface text-ink-3",
                        onSelect && "transition-colors hover:bg-measure/12 hover:text-measure"
                      )
                )}
              >
                {crumb.name}
              </Crumb>
              {!isCurrent && (
                <span aria-hidden className="text-[10px] text-rule-strong">
                  ›
                </span>
              )}
            </span>
            );
          })}
        </nav>
      </div>

      {node.asset && (
        <Section title={`${node.asset.kind} asset`}>
          <div className="mb-3 rounded-lg border border-[color:var(--limit)]/30 bg-[color:var(--limit)]/8 p-3">
            <p className="text-[12px] leading-[1.5] text-[color:var(--limit)]">
              ⚠ Asset not exported. This pipeline records where assets are, not their
              binaries — export this node from Figma to obtain it.
            </p>
          </div>
          <Row label="Inferred" value={node.asset.inferred} mono />
        </Section>
      )}

      {constraint && (
        <Section title="Limit">
          <p className="mb-3 text-[12px] leading-[1.55] text-[color:var(--limit)]">
            {constraint.summary}
          </p>
          <Row
            label={`Max ${constraint.axis ?? "height"}`}
            value={`${constraint.maxHeight}px`}
            mono
          />
          <Row label="Budget" value={`${constraint.derivation.maxChars} chars`} mono />
          <Row label="Drawn" value={`${constraint.derivation.drawnChars} chars`} mono />
          <details className="pt-2">
            <summary className="cursor-pointer text-[12px] text-ink-3">How it was derived</summary>
            <dl className="mt-2 flex flex-col gap-1">
              {constraint.derivation.steps.map((step) => (
                <div key={step.label} className="flex justify-between gap-3">
                  <dt className="text-[12px] text-ink-3">{step.label}</dt>
                  <dd className="literal text-[12px] text-ink">{step.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[11px] leading-[1.5] text-ink-4">{constraint.note}</p>
          </details>
        </Section>
      )}

      {detail ? (
        <>
          {detail.note && (
            <p className="border-b border-rule px-4 py-3 text-[12px] leading-[1.55] text-ink-3">
              {detail.note}
            </p>
          )}

          <Section title="Geometry">
            <Row
              label="Position"
              value={`x ${round(node.bounds.x)} · y ${round(node.bounds.y)}`}
              mono
            />
            <Row
              label="Size"
              value={`${round(node.bounds.width)} × ${round(node.bounds.height)}`}
              mono
            />
          </Section>

          {detail.groups.map((group) => (
            <Section key={group.title} title={group.title}>
              {group.facts.map((fact) => (
                <Row
                  key={fact.label}
                  label={fact.label}
                  node={
                    <span className="flex flex-wrap items-center justify-end gap-1.5">
                      <span className="literal text-right text-ink">{fact.value}</span>
                      {fact.token && <TokenChip>{fact.token}</TokenChip>}
                    </span>
                  }
                />
              ))}
            </Section>
          ))}
        </>
      ) : (
      <Section title="Layout">
        <Row label="Position" value={`x ${round(node.bounds.x)} · y ${round(node.bounds.y)}`} mono />
        <Row
          label="Size"
          value={`${round(node.bounds.width)} × ${round(node.bounds.height)}`}
          mono
        />
        {s?.autoLayout && <Row label="Auto layout" value={s.autoLayout} mono />}
        {s?.padding && (
          <Row
            label="Padding"
            node={
              <div className="flex flex-col items-end gap-1">
                {(["top", "right", "bottom", "left"] as const).map((side) => (
                  <TokenLine key={side} prefix={side[0]} entry={s.padding![side]} />
                ))}
              </div>
            }
          />
        )}
        {s?.gap && <Row label="Gap" node={<TokenLine entry={s.gap} />} />}
        {!s && (
          <p className="pt-2 text-[11px] leading-[1.5] text-ink-4">
            Padding, gap and auto layout are not extracted for this screen yet.
          </p>
        )}
      </Section>
      )}

      {s?.fills?.length ? (
        <Section title="Fill">
          {s.fills.map((fill, i) => (
            <Row
              key={i}
              label={fill.kind === "solid" ? "Solid" : "Gradient"}
              node={
                <span className="flex items-center gap-2">
                  {fill.kind === "solid" && (
                    <span
                      aria-hidden
                      className="size-3.5 shrink-0 rounded-sm border border-rule"
                      style={{ background: fill.value }}
                    />
                  )}
                  <span className="literal text-ink">{fill.value}</span>
                  {fill.token && <TokenChip>{fill.token}</TokenChip>}
                </span>
              }
            />
          ))}
        </Section>
      ) : null}

      {s?.radius && (
        <Section title="Radius">
          <Row label="All" node={<TokenLine entry={s.radius} />} />
        </Section>
      )}

      {s?.effects &&
        (s.effects.glass || s.effects.dropShadow?.length || s.effects.backdropBlur) && (
          <Section title="Effects">
            {s.effects.glass && <Row label="Glass" value="enabled" mono />}
            {s.effects.backdropBlur && (
              <Row label="Backdrop blur" node={<TokenLine entry={s.effects.backdropBlur} />} />
            )}
            {s.effects.dropShadow?.map((shadow, i) => (
              <Row
                key={i}
                label="Drop shadow"
                node={
                  <span className="flex flex-col items-end gap-1">
                    <span className="literal text-ink">
                      {shadow.x} {shadow.y} {shadow.blur} {shadow.spread}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="size-3.5 shrink-0 rounded-sm border border-rule"
                        style={{ background: shadow.color }}
                      />
                      <span className="literal text-ink-3">{shadow.color}</span>
                    </span>
                  </span>
                }
              />
            ))}
          </Section>
        )}

      <div className="px-4 py-4">
        <a
          href={figmaUrl(figmaFileKey, node.id)}
          target="_blank"
          rel="noreferrer"
          className="text-[12px] font-medium text-measure hover:underline"
        >
          Open this layer in Figma
        </a>
      </div>
    </div>
  );
}

/** The callout drawn on a layer, on the stage and in the prototype alike. */
export function Annotation({
  node,
  style,
  active,
  showSize,
}: {
  node: LayerNode;
  style: React.CSSProperties;
  active: boolean;
  showSize: boolean;
}) {
  const kind = node.type.toLowerCase();

  return (
    <div style={style} className="absolute">
      <div
        className={cn(
          "absolute inset-0 border",
          active ? "border-measure" : "border-[color:var(--measure)]"
        )}
      />

      <span
        className={cn(
          "literal absolute bottom-full left-0 mb-px max-w-[240px] truncate rounded-t-[3px] px-1.5 py-0.5 leading-[1.5] text-white",
          active ? "bg-measure" : "bg-[color:var(--measure)]"
        )}
      >
        <span className="opacity-60">{kind}</span> {node.name}
      </span>

      {showSize && (
        <span
          className={cn(
            "literal absolute left-0 top-full mt-px rounded-b-[3px] px-1.5 py-0.5 leading-[1.5] text-white",
            active ? "bg-measure" : "bg-[color:var(--measure)]"
          )}
        >
          {round(node.bounds.width)} × {round(node.bounds.height)}
        </span>
      )}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-rule px-4 py-4">
      <h5 className="label mb-3">{title}</h5>
      {children}
    </section>
  );
}

export function Row({
  label,
  value,
  node,
  mono = false,
}: {
  label: string;
  value?: string;
  node?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0 text-[13px] text-ink-3">{label}</span>
      {node ?? (
        <span className={cn("text-right text-[13px] text-ink", mono && "literal")}>{value}</span>
      )}
    </div>
  );
}

export function TokenLine({ entry, prefix }: { entry: TokenValue; prefix?: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {prefix && <span className="literal text-ink-4">{prefix}</span>}
      <span className="literal text-ink">{entry.value}</span>
      {entry.token && <TokenChip>{entry.token}</TokenChip>}
    </span>
  );
}

export function TokenChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="literal rounded bg-measure/10 px-1.5 py-0.5 text-measure">{children}</span>
  );
}

export function round(n: number) {
  return Number.isInteger(n) ? n : Math.round(n * 100) / 100;
}
