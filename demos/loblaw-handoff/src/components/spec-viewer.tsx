"use client";

import { useState, useMemo, useCallback, useRef, useLayoutEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { figmaUrl } from "@/lib/figma";
import {
  Inspector,
  Annotation,
  TokenChip,
  round,
} from "@/components/inspector";
import { LIVE_SCREENS } from "@/components/screens";
import { measureLiveNodes, withSections } from "@/components/screens/measure";
import {
  describeNode,
  indexTokens,
  stageGuides,
  type NodeDetail,
  type StageGuides,
} from "@/components/screens/describe";
import { StageGuideOverlay } from "@/components/screens/guides";
import type { Screen, LayerNode, TokenRow, TokenValue, Constraint, LooseEnd } from "@/lib/content";

type Tab = "designs" | "system" | "code";

const TABS: { id: Tab; label: string }[] = [
  { id: "designs", label: "Designs" },
  { id: "system", label: "System" },
  { id: "code", label: "Code" },
];

export function SpecViewer({
  screen,
  states = [screen],
}: {
  screen: Screen;
  /** The screen's content states, if it has any. A screen with none is a group of one. */
  states?: Screen[];
}) {
  const [tab, setTab] = useState<Tab>("designs");

  /**
   * Which state is on show. Held here rather than in the URL because it is a way of
   * looking at one screen, not a different screen — every tab below follows it, so the
   * tokens, the code and the loose ends always describe what is on the stage.
   */
  const [stateSlug, setStateSlug] = useState(screen.slug);
  const active = states.find((s) => s.slug === stateSlug) ?? screen;
  const hasStates = states.length > 1;

  return (
    <div>
      {hasStates && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="label shrink-0">State</span>
          <div
            role="radiogroup"
            aria-label="Content state"
            className="flex rounded-[7px] border border-rule bg-paper p-0.5"
          >
            {states.map((state) => {
              const on = state.slug === active.slug;
              return (
                <button
                  key={state.slug}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setStateSlug(state.slug)}
                  className={cn(
                    "rounded-[5px] px-3 py-1 text-[13px] transition-colors",
                    on ? "bg-ink text-white" : "text-ink-3 hover:text-ink"
                  )}
                >
                  {state.stateGroup?.label ?? state.name}
                </button>
              );
            })}
          </div>
          <p className="min-w-0 flex-1 text-[13px] text-ink-3">{active.summary}</p>

          {/* The link has to follow the toggle. The page header names the state you
              arrived on, and after one click that is no longer what is on the stage. */}
          <a
            href={figmaUrl(active.figmaFileKey, active.figmaNodeId)}
            target="_blank"
            rel="noreferrer"
            className="literal shrink-0 border-b border-rule-strong pb-0.5 text-ink-3 transition-colors hover:border-ink hover:text-ink"
          >
            {active.figmaNodeId}
          </a>
        </div>
      )}

      <div role="tablist" aria-label="Specification" className="mb-6 flex flex-wrap gap-7 border-b border-rule">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-1 pb-3 text-[15px] transition-colors",
              tab === t.id
                ? "border-ink font-medium text-ink"
                : "border-transparent text-ink-3 hover:text-ink"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {/* Keyed so a state change remounts the stage: selection, zoom and the measured
            node list all belong to the state that produced them. */}
        {tab === "designs" && <DesignsTab key={active.slug} screen={active} />}
        {tab === "system" && <SystemTab screen={active} />}
        {tab === "code" && <CodeTab screen={active} />}
      </div>
    </div>
  );
}

/* ─────────────────────────── Designs ─────────────────────────── */

function DesignsTab({ screen }: { screen: Screen }) {
  // The frame's own box, which every measurement and hit box is expressed against.
  const { width: iw, height: ih, offsetX, offsetY } = screen.imageFrame;
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  /**
   * The stage is a workspace, not an article: it is sized to the window and scrolls
   * inside itself, so the tab bar and the inspector stay put while you work.
   *
   * Measured rather than written as a `vh` expression, because what is above it — the
   * sticky bar, the screen's title and summary — changes height with the content. A
   * floor keeps it usable on a short window; below `lg` the height is dropped entirely
   * and the page scrolls normally, which is the right behaviour on a phone.
   */
  // Only engages below roughly a 660px window, where nothing would fit anyway.
  const MIN_WORKSPACE = 360;
  const [workspaceHeight, setWorkspaceHeight] = useState(MIN_WORKSPACE);

  useLayoutEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;

    const fit = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      // The page's own bottom padding, so the panel does not sit flush to the edge.
      setWorkspaceHeight(Math.max(MIN_WORKSPACE, window.innerHeight - top - 24));
    };

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  /**
   * Actual size by default, growing to fill a display that has the room.
   *
   * Fitting the whole 852px frame into a laptop's remaining height lands at about 40%,
   * which is too small to inspect anything — so the frame stays readable and the stage
   * scrolls instead. What must not scroll is the page: the tab bar, the zoom and the
   * inspector stay put while you work. Fit is still one button away.
   */
  const [zoom, setZoom] = useState(1);
  const [fitZoom, setFitZoom] = useState(1);
  const [zoomTouched, setZoomTouched] = useState(false);

  /**
   * A rebuilt screen is measured rather than replayed. `flatNodes` still carries Figma's
   * own numbers, so the two can be compared — `npm run check:screens` does exactly that —
   * but what the stage draws boxes from is the DOM in front of the reader.
   */
  const Live = screen.live ? LIVE_SCREENS[screen.live] : undefined;
  const stageRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [liveNodes, setLiveNodes] = useState<LayerNode[] | null>(null);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!Live || !el) return;

    const measure = () => setLiveNodes(withSections(measureLiveNodes(el, zoom)));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    // Poppins and the SF fallback change intrinsic widths when they swap in, which
    // moves every node whose size comes from its text.
    document.fonts?.ready.then(measure).catch(() => {});

    return () => observer.disconnect();
  }, [Live, zoom]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const fit = () => {
      // `p-10` on the scroller, both axes.
      const next = Math.min(
        (scroller.clientHeight - 80) / ih,
        (scroller.clientWidth - 80) / iw
      );
      const clamped = Math.max(0.4, Math.min(3, Math.round(next * 100) / 100));
      setFitZoom(clamped);
      // Never below actual size on its own: a display with room to spare uses it, a
      // short window keeps the frame legible and scrolls.
      if (!zoomTouched) setZoom(Math.max(1, clamped));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [ih, iw, zoomTouched]);

  const flatNodes = Live ? (liveNodes ?? []) : screen.flatNodes;

  /**
   * What the selected node is, resolved from the element itself. Recomputed on selection
   * and after a re-measure, so the readout always describes the box currently outlined.
   */
  const tokenIndex = useMemo(() => indexTokens(screen.tokensUsed), [screen.tokensUsed]);

  /**
   * How far the rebuild sits from Figma's own numbers.
   *
   * The rebuilt screen is laid out by the browser, so its boxes are exact for what is on
   * screen — but that is only worth something if it also agrees with the file. This
   * compares every measured node against the metadata and says so out loud, because a
   * fidelity claim nobody can check is just a claim.
   */
  const drift = useMemo(() => {
    if (!Live || !liveNodes) return null;
    const figma = new Map(screen.flatNodes.map((n) => [n.id, n]));
    let matched = 0;
    let worst = 0;

    for (const node of liveNodes) {
      const f = figma.get(node.id);
      if (!f) continue;
      const delta = Math.max(
        Math.abs(node.bounds.x - f.bounds.x),
        Math.abs(node.bounds.y - f.bounds.y),
        Math.abs(node.bounds.width - f.bounds.width),
        Math.abs(node.bounds.height - f.bounds.height)
      );
      if (delta < 0.5) matched += 1;
      worst = Math.max(worst, delta);
    }

    return { total: liveNodes.length, matched, worst: Math.round(worst * 10) / 10 };
  }, [Live, liveNodes, screen.flatNodes]);
  const [detail, setDetail] = useState<NodeDetail | undefined>(undefined);
  const [guides, setGuides] = useState<StageGuides>(null);

  useLayoutEffect(() => {
    if (!Live || !selected) {
      setDetail(undefined);
      setGuides(null);
      return;
    }
    const el = stageRef.current?.querySelector<HTMLElement>(
      `[data-node-id="${CSS.escape(selected)}"]`
    );
    setDetail(el ? describeNode(el, tokenIndex) : undefined);
    setGuides(el ? stageGuides(el, zoom) : null);
  }, [Live, selected, tokenIndex, liveNodes, zoom]);

  const byId = useMemo(
    () => new Map(flatNodes.map((n) => [n.id, n])),
    [flatNodes]
  );
  const selectedNode = selected ? (byId.get(selected) ?? null) : null;

  /**
   * Selection drills down, the way it does in Figma.
   *
   * With nothing selected, only the structural sections are targets — so a click lands
   * on the search bar rather than the icon inside it. Once something is selected, every
   * node inside it becomes a target too, so clicking again reaches the title, the
   * timestamp, the overflow control. Deeper nodes are painted last and therefore win the
   * click, and the breadcrumb in the inspector walks back up.
   */
  const descendantsOf = useCallback(
    (rootId: string | null) => {
      if (!rootId) return new Set<string>();
      const inside = new Set([rootId]);
      // The list is in document order, so one pass is enough: a node's parent is
      // always seen before the node itself.
      for (const n of flatNodes) {
        if (n.parentId && inside.has(n.parentId)) inside.add(n.id);
      }
      inside.delete(rootId);
      return inside;
    },
    [flatNodes]
  );

  /**
   * The constraint that applies to what is selected. Matched by name and width as well
   * as by id, because the constraint is written against one row title and the row repeats
   * eight times — the cap is a property of the component, not of that one instance.
   */
  const activeConstraint = useMemo(() => {
    if (!selectedNode) return null;
    return (
      (screen.constraints ?? []).find((c) => {
        if (c.nodeId === selectedNode.id) return true;
        const anchor = byId.get(c.nodeId);
        return (
          !!anchor &&
          anchor.name === selectedNode.name &&
          Math.abs(anchor.bounds.width - selectedNode.bounds.width) < 0.5
        );
      }) ?? null
    );
  }, [screen.constraints, selectedNode, byId]);

  const targets = useMemo(() => {
    const open = descendantsOf(selected);
    return flatNodes.filter((n) => !n.hidden && (n.isSection || open.has(n.id)));
  }, [flatNodes, selected, descendantsOf]);

  const pct = (node: LayerNode) => ({
    left: `${((node.bounds.x + offsetX) / iw) * 100}%`,
    top: `${((node.bounds.y + offsetY) / ih) * 100}%`,
    width: `${(node.bounds.width / iw) * 100}%`,
    height: `${(node.bounds.height / ih) * 100}%`,
  });

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={workspaceRef}
        className="grid gap-4 lg:h-[var(--workspace-h)] lg:grid-cols-[minmax(0,1fr)_380px]"
        style={{ "--workspace-h": `${workspaceHeight}px` } as React.CSSProperties}
      >
      {/* Stage */}
      <section className="instrument flex min-h-[360px] flex-col overflow-hidden lg:h-full lg:min-h-0">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-rule px-4 py-3">
          <h3 className="label truncate">{screen.section}</h3>
          <span className="literal shrink-0 text-ink-3">
            {screen.dimensions.width}×{screen.dimensions.height}
          </span>
        </header>

        <div ref={scrollerRef} className="flex min-h-0 flex-1 justify-center overflow-auto p-10">
          <div
            className="relative h-fit shrink-0 overflow-visible"
            style={{ width: iw * zoom }}
          >
            <div className="overflow-hidden rounded-[22px] shadow-[0_0_0_1px_var(--shadow-lift),0_24px_48px_var(--shadow-lift)]">
              {Live ? (
                /* Scaled as a whole rather than laid out at the zoomed size, so every
                   measured rect divides back to Figma pixels by one number. */
                <div
                  style={{ width: iw * zoom, height: ih * zoom }}
                  className="pointer-events-none select-none"
                >
                  <div ref={stageRef} style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                    <Live />
                  </div>
                </div>
              ) : (
                <Image
                  src={screen.image}
                  alt={screen.name}
                  width={screen.imagePixels.width}
                  height={screen.imagePixels.height}
                  sizes="(max-width: 1024px) 90vw, 1200px"
                  className="pointer-events-none block h-auto w-full select-none"
                  priority
                />
              )}
            </div>

            {/* Document order means a child is painted after its parent and therefore
                wins the click — which is what makes drilling down work. */}
            <div className="absolute inset-0">
              {targets.map((node) => (
                <button
                  key={node.id}
                  aria-label={node.name}
                  onClick={() => setSelected(node.id === selected ? null : node.id)}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={pct(node)}
                  className={cn(
                    "absolute box-border border",
                    selected === node.id
                      ? "border-measure bg-measure/14"
                      : hovered === node.id
                        ? "border-[color:var(--measure)] bg-[color:var(--measure-wash)]"
                        : "border-transparent"
                  )}
                />
              ))}

              {/* Annotations sit above the hit layer and pass clicks through, so a
                  badge never blocks the element it is labelling. */}
              <div className="pointer-events-none absolute inset-0">
                {/* A constraint is a fact about the selected thing, not a permanent
                    marking on the screen. It is also written against one node although
                    the component repeats — so it resolves onto whichever instance is
                    selected, matched by name and width, rather than pinning itself to
                    the first row and implying that row is special. */}
                {activeConstraint && selectedNode && (
                  <div style={pct(selectedNode)} className="absolute">
                    <div className="absolute inset-0 border-2 border-[color:var(--limit)]" />
                    <span className="literal absolute bottom-full left-0 mb-px rounded-t-[3px] bg-[color:var(--limit)] px-1.5 py-0.5 leading-[1.5] text-white">
                      Max {activeConstraint.axis ?? "height"} {activeConstraint.maxHeight}
                    </span>
                    <span className="literal absolute right-0 top-full mt-px rounded-b-[3px] bg-[color:var(--limit)] px-1.5 py-0.5 leading-[1.5] text-white">
                      {activeConstraint.derivation.maxChars} chars max
                    </span>
                  </div>
                )}

                {/* Padding and gap, drawn inside the selection the way the design tool
                    draws them. Only for frames that actually lay their children out. */}
                {guides && selectedNode && (
                  <div style={pct(selectedNode)} className="absolute">
                    <StageGuideOverlay guides={guides} scale={zoom} />
                  </div>
                )}

                {/* One label at a time: whatever is selected, or whatever is under
                    the cursor. Labelling every section at once is unreadable. */}
                {(() => {
                  const target = selectedNode ?? (hovered ? byId.get(hovered) : null);
                  if (!target) return null;

                  return (
                    <Annotation
                      node={target}
                      style={pct(target)}
                      active={selected === target.id}
                      showSize
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-rule px-4 py-2.5">
          <p className="text-[13px] text-ink-3">
            Hover to find a section, click to inspect it
            {drift && (
              <>
                {" · "}
                <span className="text-ink-4">
                  rebuilt · {drift.matched}/{drift.total} boxes match Figma
                  {drift.worst >= 0.5 && `, rest within ${drift.worst}px`}
                </span>
              </>
            )}
          </p>
          <div className="flex items-center gap-1">
            <ZoomButton
              onClick={() => {
                setZoomTouched(true);
                setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 100) / 100));
              }}
              label="Zoom out"
            >
              −
            </ZoomButton>
            <span className="literal w-11 text-center text-ink-3">
              {Math.round(zoom * 100)}%
            </span>
            <ZoomButton
              onClick={() => {
                setZoomTouched(true);
                setZoom((z) => Math.min(3, Math.round((z + 0.1) * 100) / 100));
              }}
              label="Zoom in"
            >
              +
            </ZoomButton>
            <ZoomButton
              onClick={() => {
                setZoomTouched(false);
                setZoom(fitZoom);
              }}
              label="Fit to the window"
            >
              ○
            </ZoomButton>
          </div>
        </footer>
      </section>

      {/* Inspector */}
      <section className="instrument flex max-h-[70vh] flex-col overflow-hidden lg:h-full lg:max-h-none">
        <header className="shrink-0 border-b border-rule px-4 py-3">
          <h3 className="label">Inspector</h3>
        </header>

        <div className="min-h-0 flex-1 overflow-auto">
          {selectedNode ? (
            <Inspector
              node={selectedNode}
              byId={byId}
              figmaFileKey={screen.figmaFileKey}
              onSelect={setSelected}
              detail={detail}
              constraint={activeConstraint}
            />
          ) : (
            <p className="p-5 text-[13px] leading-[1.6] text-ink-4">
              Hover the frame to reveal its sections, then click one to see its path,
              geometry and styles. Click again inside a selection to drill into it, and
              use the path at the top of this panel to come back up.
            </p>
          )}
        </div>
      </section>
      </div>

      {(screen.constraints ?? []).map((constraint) => (
        <ConstraintCard key={constraint.nodeId} constraint={constraint} />
      ))}

      {screen.looseEnds.length > 0 && <OpenQuestions ends={screen.looseEnds} />}
    </div>
  );
}

/**
 * What the frame does not answer.
 *
 * These were authored per screen from the start and had no surface — they reached a
 * reader only through the Memory prototype's inspector, which three screens have and
 * forty do not. Each one names the nodes it came from, so a reader can select them on
 * the stage above and see the thing being described.
 */
function OpenQuestions({ ends }: { ends: LooseEnd[] }) {
  const rank = { high: 0, medium: 1, low: 2 } as const;
  const sorted = [...ends].sort((a, b) => rank[a.severity] - rank[b.severity]);

  return (
    <section className="instrument overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3">
        <h3 className="label">Open questions</h3>
        <span className="literal text-ink-4">{ends.length}</span>
      </header>

      <div className="flex flex-col">
        {sorted.map((end) => (
          <article key={end.title} className="border-t border-rule/70 p-6 first:border-t-0">
            <div className="flex flex-wrap items-baseline gap-3">
              <h4 className="text-[16px] font-semibold text-ink">{end.title}</h4>
              <span
                className={cn(
                  "literal rounded-full px-2 py-0.5 text-[11px]",
                  end.severity === "high"
                    ? "bg-[color:var(--flag)]/10 text-[color:var(--flag)]"
                    : "bg-surface text-ink-3"
                )}
              >
                {end.severity}
              </span>
              <span className="literal text-ink-4">{end.kind}</span>
            </div>

            <p className="mt-2 max-w-[72ch] text-[14px] leading-[1.65] text-ink-2">{end.detail}</p>

            <p className="mt-3 max-w-[72ch] text-[14px] leading-[1.65] text-ink">
              <span className="text-ink-4">Ask</span> {end.ask}
            </p>

            {end.nodes.length > 0 && (
              <p className="mt-3 flex flex-wrap gap-2">
                {end.nodes.map((node) => (
                  <span key={node} className="literal rounded bg-surface px-1.5 py-0.5 text-ink-4">
                    {node}
                  </span>
                ))}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

/**
 * The working is shown rather than just the answer. A character budget asserted on its
 * own invites argument; a budget with its subtraction visible can be checked, and
 * re-derived when the type or the padding changes.
 */
function ConstraintCard({ constraint }: { constraint: Constraint }) {
  const { derivation } = constraint;
  const usage = Math.round((derivation.drawnChars / derivation.maxChars) * 100);

  return (
    <section className="instrument overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3">
        <h3 className="label">Container constraint</h3>
        <span className="literal text-ink-4">{constraint.nodeId}</span>
      </header>

      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h4 className="text-[16px] font-semibold text-ink">{constraint.label}</h4>
          <p className="mt-2 max-w-[68ch] text-[14px] leading-[1.65] text-ink-2">
            {constraint.summary}
          </p>
          <p className="mt-3 max-w-[68ch] text-[13px] leading-[1.65] text-ink-3">
            {constraint.note}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Figure
              label={constraint.axis === "width" ? "Max width" : "Max height"}
              value={`${constraint.maxHeight}px`}
            />
            <Figure label="Character ceiling" value={String(derivation.maxChars)} />
            <Figure label="Drawn design uses" value={`${derivation.drawnChars} · ${usage}%`} />
            <Figure label="Generate to" value={String(derivation.recommend)} accent />
          </div>
        </div>

        <div className="rounded-xl border border-rule bg-surface p-4">
          <p className="label mb-3">How it was derived</p>
          <dl className="flex flex-col">
            {derivation.steps.map((step, i) => (
              <div
                key={step.label}
                className={cn(
                  "flex items-baseline justify-between gap-3 py-1.5",
                  i > 0 && "border-t border-rule/70"
                )}
              >
                <dt className="text-[12px] leading-[1.4] text-ink-3">{step.label}</dt>
                <dd className="literal shrink-0 text-ink">{step.value}</dd>
              </div>
            ))}
            <div className="mt-2 flex items-baseline justify-between gap-3 border-t-2 border-rule-strong pt-2.5">
              <dt className="text-[12px] font-semibold text-ink">Ceiling</dt>
              <dd className="literal text-[13px] text-ink">{derivation.maxChars} chars</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

function Figure({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3.5 py-2.5",
        accent
          ? "border-[color:var(--limit)]/35 bg-[color:var(--limit)]/8"
          : "border-rule bg-white"
      )}
    >
      <p className="text-[13px] text-ink-3">{label}</p>
      <p
        className={cn(
          "literal text-[16px]",
          accent ? "text-[color:var(--limit)]" : "text-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ZoomButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex size-6 items-center justify-center rounded-md border border-rule bg-white text-[12px] text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
    >
      {children}
    </button>
  );
}

/* ─────────────────────────── System ─────────────────────────── */

const TOKEN_GROUPS: { key: keyof Screen["tokensUsed"]; label: string }[] = [
  { key: "colors", label: "Colour" },
  { key: "text", label: "Type" },
  { key: "spacing", label: "Spacing" },
  { key: "radius", label: "Radius" },
  { key: "stroke", label: "Stroke" },
  { key: "effects", label: "Effects" },
];

function SystemTab({ screen }: { screen: Screen }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {TOKEN_GROUPS.map(({ key, label }) => {
        const rows = screen.tokensUsed[key];
        if (!rows?.length) return null;

        return (
          <Panel key={key} title={label} meta={String(rows.length)}>
            <table className="w-full border-collapse text-left">
              <tbody>
                {rows.map((row: TokenRow, i) => (
                  <tr key={row.token} className={i > 0 ? "border-t border-rule" : undefined}>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2.5">
                        {key === "colors" && isHex(row.value) && (
                          <span
                            aria-hidden
                            className="size-4 shrink-0 rounded border border-rule"
                            style={{ background: row.value }}
                          />
                        )}
                        <span className="literal text-ink">{row.token}</span>
                      </div>
                      {row.usage && (
                        <p className="mt-1 text-[12px] leading-[1.5] text-ink-4">{row.usage}</p>
                      )}
                    </td>
                    <td className="literal whitespace-nowrap px-4 py-3 text-right align-top text-ink-3">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        );
      })}

      {screen.unmapped.length > 0 && (
        <Panel title="Unmapped values" meta={String(screen.unmapped.length)} alert>
          <table className="w-full border-collapse text-left">
            <tbody>
              {screen.unmapped.map((row, i) => (
                <tr
                  key={row.value + row.where}
                  className={i > 0 ? "border-t border-rule" : undefined}
                >
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2.5">
                      {isHex(row.value) && (
                        <span
                          aria-hidden
                          className="size-4 shrink-0 rounded border border-rule"
                          style={{ background: row.value }}
                        />
                      )}
                      <span className="literal text-ink">{row.value}</span>
                      <span className="literal text-ink-4">×{row.count}</span>
                    </div>
                    <p className="mt-1 text-[12px] leading-[1.5] text-ink-3">{row.where}</p>
                    <p className="mt-1 text-[12px] leading-[1.5] text-ink-4">{row.note}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}

function isHex(value: string) {
  return /^#([0-9a-f]{3,8})$/i.test(value);
}

/* ─────────────────────────── Code ─────────────────────────── */

const LANGS = [
  { id: "css", label: "CSS variables" },
  { id: "jsx", label: "React" },
  { id: "swiftui", label: "SwiftUI" },
] as const;

function CodeTab({ screen }: { screen: Screen }) {
  const [lang, setLang] = useState<(typeof LANGS)[number]["id"]>("css");
  const [copied, setCopied] = useState(false);

  const source = screen.code[lang];

  async function copy() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked; the code is selectable either way.
      setCopied(false);
    }
  }

  return (
    <div className="instrument overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3">
        <div className="flex gap-1">
          {LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLang(l.id)}
              className={cn(
                "rounded-[5px] px-2.5 py-1 text-[13px] transition-colors",
                lang === l.id ? "bg-surface text-ink" : "text-ink-3 hover:text-ink"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        <button
          onClick={copy}
          className="rounded-[5px] border border-rule px-2.5 py-1 text-[13px] text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre
        className="overflow-auto p-5 font-mono text-[12.5px] leading-[1.7]"
        style={{ background: "var(--code-bg)", color: "var(--code-ink)" }}
      >
        <code>{source}</code>
      </pre>
    </div>
  );
}

/* ─────────────────────────── Shared shell ─────────────────────────── */

function Panel({
  title,
  meta,
  children,
  alert = false,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <section
      className={cn(
        "instrument flex max-h-[76vh] min-h-0 flex-col overflow-hidden",
        alert && "border-[color:var(--flag)]/25"
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-rule px-4 py-3">
        <h3 className="label">{title}</h3>
        {meta && <span className="literal text-ink-4">{meta}</span>}
      </header>

      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}
