"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Inspector, Section, Row } from "@/components/inspector";
import type { LayerNode } from "@/lib/content";
import type { PrototypeData } from "@/lib/prototype";

/**
 * Lets any element in the running prototype be traced back to the Figma node it was
 * built from, and from there to the spec records already written for it.
 *
 * Elements opt in by carrying `data-node-id`; resolution is event delegation with
 * `closest()`, which gives the innermost annotated ancestor — the "child wins the
 * click" behaviour, for free, without an overlay of hit boxes.
 */

type InspectMode = "use" | "inspect";

type InspectContextValue = {
  mode: InspectMode;
  selectedId: string | null;
  hoveredId: string | null;
};

const InspectContext = createContext<InspectContextValue>({
  mode: "use",
  selectedId: null,
  hoveredId: null,
});

export const useInspect = () => useContext(InspectContext);

/** Spread onto any element that should be inspectable. */
export function inspectable(nodeId: string | undefined) {
  return nodeId ? { "data-node-id": nodeId } : {};
}

export function useInspectState() {
  const [mode, setModeRaw] = useState<InspectMode>("use");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  /**
   * Leaving inspect takes its marks with it. Nothing used to clear them, so the outline
   * and the size label stayed painted over the running prototype and read as part of
   * the product — the single worst thing about the mode switch.
   */
  const setMode = useCallback((next: InspectMode) => {
    if (next === "use") {
      setSelectedId(null);
      setHoveredId(null);
    }
    setModeRaw(next);
  }, []);

  // `I` toggles inspect; Escape leaves it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Not always an Element — a keydown with nothing focused can target the
      // document, which has no `closest`.
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, [contenteditable]")) return;

      if (e.key === "i" || e.key === "I") {
        setMode(mode === "use" ? "inspect" : "use");
      } else if (e.key === "Escape") {
        setMode("use");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, setMode]);

  /**
   * In `use` mode this only acts when Alt is held, so the normal flow is untouched —
   * "make it work primarily" and "inspect at any moment" at the same time.
   */
  const onPointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      if (mode === "use" && !e.altKey) return;
      const el = (e.target as HTMLElement).closest("[data-node-id]");
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      setSelectedId(el.getAttribute("data-node-id"));
    },
    [mode]
  );

  const onClickCapture = useCallback(
    (e: React.MouseEvent) => {
      if (mode === "use" && !e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
    },
    [mode]
  );

  const onPointerOverCapture = useCallback(
    (e: React.PointerEvent) => {
      if (mode === "use" && !e.altKey) {
        setHoveredId(null);
        return;
      }
      const el = (e.target as HTMLElement).closest("[data-node-id]");
      setHoveredId(el?.getAttribute("data-node-id") ?? null);
    },
    [mode]
  );

  return {
    mode,
    setMode,
    selectedId,
    setSelectedId,
    hoveredId,
    setHoveredId,
    handlers: {
      onPointerDownCapture,
      onClickCapture,
      onPointerOverCapture,
      onPointerLeave: () => setHoveredId(null),
    },
    Provider: InspectContext.Provider,
  };
}

type Box = { x: number; y: number; w: number; h: number };

/**
 * Where a node sits, measured from the live DOM rather than from Figma bounds, because
 * the prototype is real layout — if the two disagree, the drawn box is the truth about
 * what was built.
 */
function useMeasuredBox(
  frameRef: React.RefObject<HTMLElement | null>,
  targetId: string | null,
  scrollKey: number
) {
  const [box, setBox] = useState<Box | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    function measure() {
      const frame = frameRef.current;
      if (!frame || !targetId) return setBox(null);

      const el = frame.querySelector(`[data-node-id="${CSS.escape(targetId)}"]`);
      if (!el) return setBox(null);

      const a = el.getBoundingClientRect();
      const b = frame.getBoundingClientRect();
      setBox({ x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height });
    }

    measure();
    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onScroll);
    const scroller = frameRef.current?.querySelector(".proto-scroller");
    scroller?.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", onScroll);
      scroller?.removeEventListener("scroll", onScroll);
    };
  }, [frameRef, targetId, scrollKey]);

  return box;
}

function Mark({ box, selected }: { box: Box; selected: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-[60]"
      style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
    >
      <div
        className={cn(
          "absolute inset-0",
          selected ? "border-2 border-measure" : "border border-[color:var(--measure)]/60"
        )}
      />
      <span
        className={cn(
          "literal absolute left-0 top-full mt-px rounded-b-[3px] px-1.5 py-0.5 leading-[1.5] text-white",
          selected ? "bg-measure" : "bg-[color:var(--measure)]/60"
        )}
      >
        {Math.round(box.w)} × {Math.round(box.h)}
      </span>
    </div>
  );
}

/**
 * The marks drawn over the prototype. Both at once, the way Figma does it: what you
 * picked stays put while the pointer keeps reporting what it is over. Drawing only
 * `selected ?? hovered` meant hover died at the first click and the mode felt frozen.
 *
 * Always `pointer-events: none`, so neither can ever eat a tap.
 */
export function InspectLayer({
  frameRef,
  selectedId,
  hoveredId,
  scrollKey,
}: {
  frameRef: React.RefObject<HTMLElement | null>;
  selectedId: string | null;
  hoveredId: string | null;
  scrollKey: number;
}) {
  const selected = useMeasuredBox(frameRef, selectedId, scrollKey);
  // Suppressed on the selected node itself, so the two never stack into one
  // double-weight border with two size labels on top of each other.
  const hovered = useMeasuredBox(
    frameRef,
    hoveredId && hoveredId !== selectedId ? hoveredId : null,
    scrollKey
  );

  return (
    <>
      {hovered && <Mark box={hovered} selected={false} />}
      {selected && <Mark box={selected} selected />}
    </>
  );
}

/**
 * What a selected element reveals: the layer readout the static stage already uses,
 * plus the open questions filed against that node, the limit it has to respect, and the
 * component that renders it.
 */
export function InspectorPanel({
  node,
  byId,
  data,
  onClose,
}: {
  /** Absent until the first pick — the panel is up, waiting, from the moment you enter. */
  node: LayerNode | undefined;
  byId: Map<string, LayerNode>;
  data: PrototypeData;
  onClose: () => void;
}) {
  const ends = node ? data.looseEnds.filter((l) => l.end.nodes.includes(node.id)) : [];
  const limit = node
    ? data.constraints.find((c) => c.constraint.nodeId === node.id)
    : undefined;
  const code = node ? data.code[node.id] : undefined;
  const screenSlug = node ? data.nodeScreen[node.id] : undefined;

  return (
    <aside className="instrument flex max-h-[852px] flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-rule px-4 py-3">
        <h3 className="label">Inspector</h3>
        {node && (
          <button
            onClick={onClose}
            className="literal rounded border border-rule px-2 py-0.5 text-ink-3 transition-colors hover:border-rule-strong hover:text-ink"
          >
            close
          </button>
        )}
      </header>

      {!node && (
        <p className="px-4 py-4 text-[13px] leading-[1.6] text-ink-3">
          Pick any element in the prototype to see the layer it came from, what it is
          built out of, and anything still open against it.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {node && <Inspector node={node} byId={byId} figmaFileKey={data.figmaFileKey} />}

        {limit && (
          <Section title="Limit">
            <div className="rounded-lg border border-[color:var(--limit)]/30 bg-[color:var(--limit)]/8 p-3">
              <p className="text-[13px] font-medium leading-[1.5] text-[color:var(--limit)]">
                {limit.constraint.label}
              </p>
              <p className="mt-1.5 text-[12px] leading-[1.55] text-ink-2">
                {limit.constraint.maxHeight}px, about {limit.constraint.derivation.maxChars}{" "}
                characters. The drawn design uses {limit.constraint.derivation.drawnChars}.
              </p>
            </div>
          </Section>
        )}

        {ends.length > 0 && (
          <Section title={ends.length === 1 ? "Open question" : "Open questions"}>
            <div className="flex flex-col gap-3">
              {ends.map(({ end }) => (
                <div
                  key={end.title}
                  className="rounded-lg border border-[color:var(--flag)]/25 bg-[color:var(--flag)]/6 p-3"
                >
                  <p className="text-[13px] font-medium leading-[1.45] text-ink">{end.title}</p>
                  <p className="mt-1.5 text-[12px] leading-[1.55] text-ink-2">{end.ask}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {code && (
          <Section title="Built by">
            <Row label="File" value={code.file} mono />
            <pre
              className="mt-3 overflow-auto rounded-lg p-3 font-mono text-[11.5px] leading-[1.65]"
              style={{ background: "var(--code-bg)", color: "var(--code-ink)" }}
            >
              <code>{code.snippet}</code>
            </pre>
          </Section>
        )}

        {screenSlug && (
          <div className="px-4 py-4">
            <Link
              href={`/screens/${screenSlug}`}
              className="text-[12px] font-medium text-measure hover:underline"
            >
              Open the full spec for this screen
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
