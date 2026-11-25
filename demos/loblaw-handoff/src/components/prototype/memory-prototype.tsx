"use client";

import { useReducer, useMemo, useRef, useEffect, useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { reducer, init, currentMomentId } from "./memory-machine";
import { useInspectState, InspectLayer, InspectorPanel, inspectable } from "./inspect";
import { MemoryHome, MemoryChrome, MemoryDetails, DeleteDialog, Glyph, text } from "./memory-screens";
import type { LoadPhase } from "./load-phases";
import type { PrototypeData } from "@/lib/prototype";

/**
 * The running prototype: one client island owning the app state, the inspect state and
 * the key-moment rail, so they can stay in step without a shared store.
 */
export function MemoryPrototype({ data, bare = false }: { data: PrototypeData; bare?: boolean }) {
  const [state, dispatch] = useReducer(reducer, data, init);
  const inspect = useInspectState();

  /**
   * The load-in.
   *
   * Runs once per page load, and again on Reset. It starts when the frame is actually
   * on screen — firing it on mount would spend the whole sequence above the fold, where
   * this prototype never is.
   *
   * `stream` is the one phase not on a timer: it ends when the last word lands, so
   * changing the copy changes the timing without anyone having to retune a delay.
   */
  const [phase, setPhase] = useState<LoadPhase>("idle");
  const [runId, setRunId] = useState(0);

  const frameRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const [scrollKey, setScrollKey] = useState(0);

  /**
   * Two effects, deliberately. The observer's only job is "the frame has been seen" —
   * it runs once and is done. Replaying must not depend on it: when the callback
   * happened to land in the same commit as a reset, React collapsed `done → idle →
   * header` into one render, the resting state was never painted, and Reset appeared
   * to do nothing. Which of the two won was a race, which is why it only sometimes
   * replayed.
   */
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = frameRef.current;
    if (!el || seen) return;
    // Embedded bare, the page around it says when the phone has been landed on (below).
    if (bare && window.parent !== window) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setSeen(true);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [seen]);

  /**
   * Embedded, the host page posts `{ demo: "land" }` each time its plate is landed on: the
   * first starts the entrance, and each one after replays it from a fresh state, the way
   * Reset does. Its own observer would fire on load, wherever the plate is. `leave` stops
   * the tour below.
   */
  const [touring, setTouring] = useState(false);
  useEffect(() => {
    if (!bare || window.parent === window) return;
    let landed = false;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || (event.data?.demo !== "land" && event.data?.demo !== "leave")) return;
      if (event.data?.demo === "leave") {
        setTouring(false);
        return;
      }
      if (landed) {
        dispatch({ type: "RESET", data });
        setRunId((n) => n + 1);
      }
      landed = true;
      setSeen(true);
      setTouring(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [bare, data]);

  /**
   * The tour, embedded only: once the entrance settles, the phone walks itself through the
   * flow (open a memory, ask to delete it, confirm, undo) and then starts over. Touching
   * the phone stops it there, so it can be used.
   */
  useEffect(() => {
    if (!touring || phase !== "done") return;
    const subject = data.memories.find((m) => m.id === "mem-penicillin") ?? data.memories[0];
    const steps: [number, () => void][] = [
      [1800, () => dispatch({ type: "OPEN_DETAIL", memoryId: subject.id })],
      [2400, () => dispatch({ type: "REQUEST_DELETE" })],
      [2000, () => dispatch({ type: "CONFIRM_DELETE" })],
      [2800, () => dispatch({ type: "UNDO" })],
      [2400, () => {
        dispatch({ type: "RESET", data });
        setRunId((n) => n + 1);
      }],
    ];
    let at = 0;
    const timers = steps.map(([ms, run]) => window.setTimeout(run, (at += ms)));
    return () => timers.forEach(window.clearTimeout);
  }, [touring, phase, data]);

  // Play, and replay on Reset or an option change. Parking at `idle` has to be its own
  // painted frame — the sections are still at their settled opacity, and releasing in
  // the same render leaves the transition nothing to start from. Two frames guarantee
  // the paint; the third line is the floor, because rAF is frozen in a backgrounded
  // tab and would otherwise park the sequence at `idle` and leave an empty phone.
  useEffect(() => {
    if (!seen) return;

    /**
     * Inspect examines the finished screen, so it settles rather than plays. This has
     * to live here, in the effect that owns the sequence: a separate effect setting
     * `done` raced the release already queued below, and the entrance would restart
     * underneath it. Returning early instead lets this effect's cleanup cancel that
     * release first.
     */
    if (inspect.mode === "inspect") {
      setPhase("done");
      return;
    }

    setPhase("idle");

    const release = () => setPhase("header");
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(release);
    });
    const floor = window.setTimeout(release, 120);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(floor);
    };
  }, [seen, runId, inspect.mode]);

  // The body fades rather than metering itself in, so its phase is timed. Mirrors
  // --proto-dur-body in globals.css — change both together.
  const BODY_FADE_MS = 1600;
  useEffect(() => {
    if (phase !== "stream") return;
    const next = window.setTimeout(() => setPhase("groups"), BODY_FADE_MS);
    return () => window.clearTimeout(next);
  }, [phase]);

  // The timed steps. `stream` is not here — the timer above ends it.
  useEffect(() => {
    if (phase !== "header" && phase !== "groups") return;

    const ms = phase === "header" ? 340 : 560;
    const next = window.setTimeout(
      () => setPhase(phase === "header" ? "card" : "done"),
      ms
    );
    return () => window.clearTimeout(next);
  }, [phase]);

  // The card has to be up before its text can arrive.
  useEffect(() => {
    if (phase !== "card") return;
    const next = window.setTimeout(() => setPhase("stream"), 420);
    return () => window.clearTimeout(next);
  }, [phase]);

  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const selectedNode = inspect.selectedId ? byId.get(inspect.selectedId) : undefined;

  const detailOpen = state.overlay.kind === "detail" || state.overlay.kind === "confirm";
  const confirmOpen = state.overlay.kind === "confirm";
  const bulkOpen = state.overlay.kind === "confirmBulk";
  const bulkGoing = state.memories.filter((m) => state.selected.includes(m.id));
  const loadLocked = detailOpen || (phase !== "done" && inspect.mode === "use");
  const activeMemoryId =
    state.overlay.kind === "detail" || state.overlay.kind === "confirm"
      ? state.overlay.memoryId
      : null;

  /**
   * The drawer keeps rendering its memory while it slides out, so the payload is held
   * past the point the state clears — otherwise the content blanks mid-animation.
   */
  const lastMemoryId = useRef<string | null>(null);
  if (activeMemoryId) lastMemoryId.current = activeMemoryId;
  const shownMemory =
    data.memories.find((m) => m.id === (activeMemoryId ?? lastMemoryId.current)) ?? null;

  /**
   * Delete runs in two phases so the row can animate out. `CONFIRM_DELETE` closes the
   * overlays and marks the row; the collapse finishing commits the removal.
   *
   * `transitionend` is the primary signal, with a timeout as a safety net — the event
   * does not fire in a background tab, and a stuck phase machine is a dead prototype.
   */
  const commit = useCallback((memoryId: string) => {
    dispatch({ type: "COMMIT_REMOVAL", memoryId });
  }, []);

  useEffect(() => {
    const exiting = state.exitingId;
    if (!exiting) return;

    const frame = frameRef.current;
    const row = frame?.querySelector<HTMLElement>(`[data-memory-id="${exiting}"]`);

    function onEnd(e: TransitionEvent) {
      if (e.target !== e.currentTarget) return;
      if (e.propertyName !== "grid-template-rows") return;
      commit(exiting!);
    }

    row?.addEventListener("transitionend", onEnd);
    const fallback = window.setTimeout(() => commit(exiting), 900);
    timers.current.push(fallback);

    return () => {
      row?.removeEventListener("transitionend", onEnd);
      window.clearTimeout(fallback);
    };
  }, [state.exitingId, commit]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  // Focus goes into the dialog when it opens, so the keyboard is not stranded behind it.
  useEffect(() => {
    if (confirmOpen) dialogRef.current?.querySelector("button")?.focus();
  }, [confirmOpen]);

  const moment = currentMomentId(state);

  /** The phone itself. Inspecting wires the inspect handlers; the bare phone only takes use. */
  const frame = (inspecting: boolean) => (
    <div
      ref={frameRef}
      {...(inspecting ? inspect.handlers : {})}
      /* While the sequence is parked at idle, everything staged inside snaps to
         its resting state rather than easing there — see globals.css. */
      onPointerDownCapture={bare ? () => setTouring(false) : undefined}
      data-reset={phase === "idle"}
      data-phase={phase}
      onScrollCapture={() => setScrollKey((k) => k + 1)}
      className={cn(
        "proto proto-frame shadow-[0_0_0_1px_var(--shadow-soft),0_24px_60px_var(--shadow-lift)]",
        inspecting && inspect.mode === "inspect" && "cursor-crosshair"
      )}
    >
      {/* `inert` blocks pointer, scroll and focus in one attribute while an
          overlay is up — cleaner than juggling overflow and tabindex. It also
          holds through the entrance, since a half-built screen is not something
          to let anyone click into. Inspect is exempt: it never drives the screen,
          and blanking it for the length of the entrance was most of why the mode
          switch felt broken. */}
      <div className="proto-scroller" inert={loadLocked}>
        <MemoryHome
          data={data}
          state={state}
          onOpen={(id) => dispatch({ type: "OPEN_DETAIL", memoryId: id })}
          onToggle={(id) => dispatch({ type: "TOGGLE_SELECTED", memoryId: id })}
          phase={phase}
        />
      </div>

      {/* Chrome is a sibling of the scroller, not a child of it — inside, an
          absolutely positioned bar scrolls with the content. It goes inert on the
          same terms so nothing behind an overlay stays clickable.

          Search and Select share one group here, and selection swaps that group's
          contents. The alternative — a second bar laid over the first — left the
          nav's own buttons alive underneath it. */}
      <div inert={loadLocked}>
        <MemoryChrome
          data={data}
          phase={phase}
          selecting={state.selecting}
          allSelected={state.selected.length === state.memories.length}
          onSelect={() => dispatch({ type: "START_SELECTING" })}
          onSelectAll={() => dispatch({ type: "SELECT_ALL" })}
          onCancel={() => dispatch({ type: "STOP_SELECTING" })}
        />
      </div>

      {/* The counted Delete the selection frame puts at the foot. The count is of
          memories, so the fever memory ticked in two groups still counts once. */}
      {state.selecting && state.selected.length > 0 && (
        <button
          {...inspectable(data.anchors.selectDelete)}
          onClick={() => dispatch({ type: "REQUEST_DELETE" })}
          className="proto-glass proto-text-md-semibold absolute bottom-[24px] right-[24px] z-20 flex h-[54px] items-center justify-center rounded-full px-[40px] text-[var(--fig-text-danger)]"
        >
          Delete {state.selected.length}{" "}
          {state.selected.length === 1 ? "memory" : "memories"}
        </button>
      )}

      <MemoryDetails
        data={data}
        memory={shownMemory}
        open={detailOpen}
        pageRef={sheetRef}
        onDelete={() => dispatch({ type: "REQUEST_DELETE" })}
        onDismiss={() => dispatch({ type: "CLOSE_OVERLAY" })}
      />

      <DeleteDialog
        data={data}
        open={confirmOpen}
        dialogRef={dialogRef}
        onCancel={() => dispatch({ type: "CLOSE_OVERLAY" })}
        onConfirm={() => dispatch({ type: "CONFIRM_DELETE" })}
      />

      {/* The selection's own gate. Its copy is plural and it names what is going,
          which the single-memory dialog does not have to do. */}
      <DeleteDialog
        data={data}
        open={bulkOpen}
        dialogRef={dialogRef}
        title={`Delete ${bulkGoing.length} ${bulkGoing.length === 1 ? "memory" : "memories"}?`}
        body="These memories will be permanently deleted. If you share the details again, we’ll save them as new memories. Your chat history stays."
        listing={bulkGoing.map((m) => m.text)}
        onCancel={() => dispatch({ type: "CLOSE_OVERLAY" })}
        onConfirm={() => dispatch({ type: "CONFIRM_DELETE" })}
      />

      {state.toast && (
        <div
          role="status"
          {...inspectable(data.anchors.toast)}
          /* The file's Toast, where the file puts it: 361 wide at the top of the
             frame, 8px padding, the message 24 in at Text xs/Semibold, and a glass
             dismiss. It was a dark pill at the foot. */
          className="proto-glass absolute inset-x-[16px] top-[60px] z-[55] flex h-[56px] items-center justify-between gap-[var(--fig-space-8)] rounded-[32px] p-[var(--fig-space-8)]"
        >
          <span
            {...inspectable(data.anchors.toastMessage)}
            className="proto-text-xs-semibold min-w-0 flex-1 truncate pl-[var(--fig-space-16)]"
          >
            {state.toast.message}
          </span>
          {/* The component carries this beside the message. The frame switches it
              off, so a delete there is final — see the open question on the screen. */}
          {state.toast.undo && (
            <button
              {...inspectable(data.anchors.toastAction)}
              onClick={() => dispatch({ type: "UNDO" })}
              className="proto-text-xs-semibold shrink-0 px-[var(--fig-space-8)] underline underline-offset-2"
            >
              {text(data.copy.undo)}
            </button>
          )}
          <span
            {...inspectable(data.anchors.toastDismiss)}
            aria-hidden
            className="flex size-[40px] shrink-0 items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.4)" }}
          >
            <Glyph name="close" size={16} />
          </span>
        </div>
      )}

      <InspectLayer
        frameRef={frameRef}
        selectedId={inspect.selectedId}
        hoveredId={inspect.hoveredId}
        scrollKey={scrollKey}
      />
    </div>
  );

  // Bare is the phone alone, for a page that embeds it: no mode switch, inspector, rail or blurb.
  if (bare) {
    return (
      <section className="proto-host proto-bare">
        {frame(false)}
      </section>
    );
  }

  return (
    <section className="proto-host flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          {/* Frame chrome — the one place the prototype admits it is a prototype.
              Two rows: what you are doing to the frame, then how it plays. */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              {(["use", "inspect"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => inspect.setMode(m)}
                  className={cn(
                    "rounded-[5px] px-2.5 py-1 text-[13px] transition-colors",
                    inspect.mode === m
                      ? "bg-ink text-white"
                      : "text-ink-3 hover:text-ink"
                  )}
                >
                  {m === "use" ? "Use" : "Inspect"}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-4">
              <button
                onClick={() => {
                  dispatch({ type: "RESET", data });
                  inspect.setSelectedId(null);
                  setRunId((n) => n + 1);
                }}
                className="text-[13px] text-ink-3 transition-colors hover:text-ink"
              >
                Reset
              </button>
            </div>
          </div>

          {frame(true)}

          <p className="max-w-[393px] text-[13px] leading-[1.5] text-ink-3">
            {inspect.mode === "inspect"
              ? "Click any section to inspect it. Press I to go back to using it."
              : "Hold Alt and click to inspect anything without leaving the flow, or switch to Inspect."}
          </p>
        </div>

        {inspect.mode === "inspect" || selectedNode ? (
          <InspectorPanel
            node={selectedNode}
            byId={byId}
            data={data}
            onClose={() => inspect.setSelectedId(null)}
          />
        ) : (
          <div className="hidden xl:block">
            <p className="max-w-[54ch] text-[15px] leading-[1.65] text-ink-2">{data.blurb}</p>
          </div>
        )}
      </div>

      <KeyMoments data={data} active={moment} onPick={(id) => dispatch({ type: "GOTO_MOMENT", momentId: id, data })} />
    </section>
  );
}

/**
 * The rail below the frame. Bound both ways: picking a moment drives the prototype into
 * that state, and using the prototype lights up the moment you are in.
 */
function KeyMoments({
  data,
  active,
  onPick,
}: {
  data: PrototypeData;
  active: string;
  onPick: (id: string) => void;
}) {
  return (
    <div>
      <div className="measured mb-4">
        <h3 className="text-[17px] font-semibold text-ink">Key moments</h3>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.moments.map((moment) => {
          const isActive = moment.id === active;
          const undrawn = moment.screen === null;

          return (
            <li key={moment.id}>
              <button
                onClick={() => onPick(moment.id)}
                className={cn(
                  "flex h-full w-full flex-col gap-3 rounded-[10px] border p-4 text-left transition-colors",
                  isActive ? "border-measure bg-measure/5" : "border-rule bg-paper hover:border-rule-strong",
                  undrawn && !isActive && "border-dashed border-[color:var(--flag)]/40"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-medium text-ink">{moment.label}</span>
                  {isActive && <span className="literal text-measure">here</span>}
                </div>

                {moment.image ? (
                  <Image
                    src={moment.image}
                    alt=""
                    width={393}
                    height={852}
                    sizes="150px"
                    className="w-full rounded-[6px] border border-rule bg-surface"
                  />
                ) : (
                  <div className="flex aspect-[393/852] w-full items-center justify-center rounded-[6px] border border-dashed border-[color:var(--flag)]/40 px-4 text-center text-[12px] leading-[1.5] text-[color:var(--flag)]">
                    Not drawn
                  </div>
                )}

                <p className="text-[13px] leading-[1.55] text-ink-3">{moment.note}</p>

                {moment.screen ? (
                  <Link
                    href={`/screens/${moment.screen}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[13px] text-measure hover:underline"
                  >
                    Open the spec
                  </Link>
                ) : (
                  <span className="text-[13px] text-[color:var(--flag)]">
                    The prototype is the only spec for this state
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
