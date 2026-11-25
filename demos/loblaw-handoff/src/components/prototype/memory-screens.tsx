"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { inspectable } from "./inspect";
import { memoriesInGroup, type State } from "./memory-machine";
import { BrandMark } from "./brand-mark";
import { LOAD_PHASES, reachedPhase, type LoadPhase } from "./load-phases";
import type { PrototypeData, PrototypeMemory, CopyEntry } from "@/lib/prototype";

/**
 * The product screens, built from the extracted geometry rather than from Figma's
 * class strings — those use slash-named tokens Tailwind cannot compile, which is why
 * this file speaks in `--fig-*` instead.
 */

export const text = (entry: CopyEntry | CopyEntry[]) => (Array.isArray(entry) ? "" : entry.text);

/** Real vector, exported from Figma. Never hand-drawn — see the plan. */
export function Glyph({ name, size }: { name: string; size: number }) {
  return (
    <Image
      src={`/demos/loblaw-handoff/proto/icons/${name}.svg`}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}

/* ─────────────────────────── Memory home ─────────────────────────── */

export function MemoryHome({
  data,
  state,
  onOpen,
  onToggle,
  phase,
}: {
  data: PrototypeData;
  state: State;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  /** Where the load-in has got to. See `LOAD_PHASES` in memory-prototype.tsx. */
  phase: LoadPhase;
  /** How many words of the summary have arrived. */
}) {
  const { copy, anchors } = data;
  const paragraphs = Array.isArray(copy.summaryParagraphs) ? copy.summaryParagraphs : [];

  // Each section is released once the sequence has reached it and stays released
  // afterwards, so the attribute only ever flips one way per run.
  const reached = (at: LoadPhase) => reachedPhase(phase, at);

  return (
    <div
      {...inspectable(anchors.content)}
        className="flex flex-col gap-[32px] px-[var(--fig-space-16)] pb-[var(--fig-space-16)] pt-[146px]"
      >
        <header
          {...inspectable(anchors.header)}
          data-enter={reached("header")}
          className="proto-enter flex flex-col gap-[var(--fig-space-4)] px-[var(--fig-space-8)]"
        >
          <h1 className="proto-display-xs-semibold">{text(copy.title)}</h1>
          <p className="proto-text-md-medium text-[var(--fig-text-secondary)]">
            {text(copy.intro)}
          </p>
        </header>

        {/* The constrained container: 359 x 350 with a 460-character ceiling. */}
        <section
          {...inspectable(anchors.summaryCard)}
          data-enter={reached("card")}
          style={{ transitionDelay: "var(--proto-delay-card)" }}
          className="proto-enter flex flex-col items-start gap-[var(--fig-space-8)] rounded-[20px] border-2 border-[var(--fig-new-neutrals-white)] bg-[var(--fig-bg-surface)] p-[var(--fig-space-16)]"
        >
          {/* Turns as the card lands, once, and settles — the mark's own beat rather
              than a progress indicator for the text arriving beside it. */}
          <BrandMark {...inspectable(anchors.brandMark)} spinning={reached("card")} />
          <h2 className="proto-text-lg-semibold text-[var(--fig-text-secondary-alt)]">
            {text(copy.summaryHeading)}
          </h2>
          {/* The body is present from the moment the card is, so it reserves its own
              height and the card never resizes under it. The fade is the arrival. */}
          {paragraphs.map((p) => (
            <p
              key={p.node}
              {...inspectable(p.node)}
              data-enter={reached("stream")}
              className="proto-body-fade proto-text-sm-regular w-full text-[var(--fig-neutral-700)]"
            >
              {p.text}
            </p>
          ))}
          {/* Arrives once the summary has finished, so the card closes itself off before
              the list below it starts. Opacity leaves it in flow, so the card's height —
              already reserved — does not move when it lands. */}
          <p
            data-enter={reached("groups")}
            className="proto-enter proto-text-xs-medium pt-[var(--fig-space-8)] text-[var(--fig-text-tertiary)]"
          >
            {text(copy.summaryUpdated)}
          </p>
        </section>

        <div className="flex flex-col gap-[32px]">
          {data.groups.map((group, i) => {
            const items = memoriesInGroup(state, group.id);
            if (!items.length) return null;

            return (
              <div
                key={group.id}
                data-enter={reached("groups")}
                style={{ "--i": i + 1 } as React.CSSProperties}
                className="proto-enter flex flex-col gap-[32px]"
              >
                <section {...inspectable(group.node)} className="flex flex-col gap-[var(--fig-space-8)]">
                  <h3
                    {...inspectable(group.titleNode)}
                    className="proto-text-md-semibold px-[var(--fig-space-8)]"
                  >
                    {group.title}
                  </h3>

                  <ul {...inspectable(group.listNode)} className="flex flex-col">
                    {items.map((memory) => (
                      <MemoryRow
                        key={memory.id}
                        memory={memory}
                        groupId={group.id}
                        removing={state.exitingId === memory.id}
                        onOpen={onOpen}
                        selecting={state.selecting}
                        checked={state.selected.includes(memory.id)}
                        onToggle={onToggle}
                        /* The second group binds 14px timestamps where the first binds
                           12px. Reproduced rather than corrected — it is a logged
                           inconsistency, and the 58/60 row heights follow from it. */
                        timestampSize={i === 0 ? 12 : 14}
                      />
                    ))}
                  </ul>
                </section>

                <div className="h-px w-full bg-[var(--fig-new-neutrals-light-grey)]" />
              </div>
            );
          })}
        </div>
      </div>
  );
}

/**
 * The status bar, the top nav and the fade behind them.
 *
 * These sit beside `.proto-scroller` rather than inside it. Inside, `position: absolute`
 * resolves against the scroller's content box and scrolls away with everything else —
 * which is what had the title riding up over the clock.
 *
 * The fade is Figma's `Overlay` (7788:24142): the search overlay's gradient turned 180°,
 * so white at 90% under the status bar easing to nothing 140px down. It carries no
 * `data-node-id` — that node lives in the chips-and-summary frame, not in the home frame
 * this screen documents, which is filed as a finding rather than papered over.
 *
 * Search sits here now, beside Select. It used to be a pill pinned over the foot of the
 * list; the file moved it into the nav and dropped the bottom bar. Selection swaps this
 * group's contents rather than covering it with a second bar, which is why Back survives
 * into selection the way the frame draws it.
 */
export function MemoryChrome({
  data,
  phase,
  selecting,
  allSelected,
  onSelect,
  onSelectAll,
  onCancel,
}: {
  data: PrototypeData;
  phase: LoadPhase;
  selecting: boolean;
  allSelected: boolean;
  onSelect: () => void;
  onSelectAll: () => void;
  onCancel: () => void;
}) {
  const { copy, anchors } = data;

  // The actions arrive with the title, the pill a beat behind the back button, so the
  // chrome reads left to right rather than appearing all at once.
  const show = reachedPhase(phase, "header");

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[140px]"
        style={{
          background: "linear-gradient(to bottom, #FFFFFFE6, #FFFFFFB3 65.4%, #FFFFFF00)",
        }}
      />

      {/* Status bar — OS chrome, drawn rather than extracted. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-[54px] items-center justify-between px-[28px] pt-[12px]"
        data-proto-chrome="os"
      >
        <span className="proto-text-md-semibold text-[17px]">20:16</span>
        <span className="flex items-center gap-[5px]">
          <span className="flex items-end gap-[2px]">
            {[4, 6, 8, 10].map((h) => (
              <span key={h} className="w-[3px] rounded-[1px] bg-black" style={{ height: h }} />
            ))}
          </span>
          <span className="ml-[3px] h-[11px] w-[24px] rounded-[3px] border border-black/40 p-[1.5px]">
            <span className="block h-full w-[80%] rounded-[1px] bg-black" />
          </span>
        </span>
      </div>

      {/* Top nav sits over the scroller, so it must not swallow scroll. */}
      <div
        {...inspectable(anchors.topNav)}
        className="pointer-events-none absolute inset-x-0 top-[54px] z-10 flex h-[68px] items-center justify-between px-[var(--fig-space-24)] py-[var(--fig-space-12)]"
      >
        {/* Opacity sits on the glass itself, never on something above it. The trap the
            sheet comment describes is an ANCESTOR with opacity, which groups the subtree
            and leaves Safari sampling a flattened backdrop; an element fading its own
            compositing is the ordinary case. Worth a look in Safari all the same. */}
        <button
          {...inspectable(anchors.back)}
          data-enter={show}
          aria-label="Back"
          className="proto-enter proto-glass pointer-events-auto flex size-[44px] items-center justify-center rounded-full"
        >
          <Glyph name="back" size={16} />
        </button>

        <div
          {...inspectable(selecting ? anchors.selectActions : anchors.navActions)}
          className="flex items-center gap-[4px]"
        >
          {selecting ? (
            <>
              <NavPill anchor={anchors.selectAll} show={show} order={1} onClick={onSelectAll}>
                {allSelected ? "Deselect all" : "Select all"}
              </NavPill>
              <NavPill anchor={anchors.selectCancel} show={show} order={2} onClick={onCancel}>
                Cancel
              </NavPill>
            </>
          ) : (
            <>
              {/* No handler: the file draws this control but the search itself lives in
                  a section that has not been extracted, so sending it somewhere would be
                  inventing the destination. See the open question on the screen. */}
              <NavPill
                anchor={anchors.searchButton}
                show={show}
                order={1}
                icon={
                  <span {...inspectable(anchors.searchIcon)} className="flex">
                    <Glyph name="search" size={16} />
                  </span>
                }
              >
                {text(copy.search)}
              </NavPill>
              <NavPill anchor={anchors.select} show={show} order={2} onClick={onSelect}>
                {text(copy.selectLabel)}
              </NavPill>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * One pill in the nav's action group.
 *
 * No width is set. The component puts 36px either side of its label, and 148 / 119 in
 * browse and 140 / 123 in selection fall out of that — which is also why the group
 * starts at x=98 with Search in it and x=102 without.
 */
function NavPill({
  anchor,
  show,
  order,
  icon,
  onClick,
  children,
}: {
  anchor: string;
  show: boolean;
  order: number;
  icon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      {...inspectable(anchor)}
      onClick={onClick}
      data-enter={show}
      style={{ "--i": order } as React.CSSProperties}
      className="proto-enter proto-glass proto-text-md-semibold pointer-events-auto flex h-[46px] items-center justify-center gap-[var(--fig-space-8)] rounded-full px-[36px] text-[var(--fig-text-primary)]"
    >
      {icon}
      {children}
    </button>
  );
}

function MemoryRow({
  memory,
  groupId,
  removing,
  onOpen,
  timestampSize,
  selecting = false,
  checked = false,
  onToggle,
}: {
  memory: PrototypeMemory;
  groupId: string;
  removing: boolean;
  onOpen: (id: string) => void;
  timestampSize: number;
  /** Selection is a mode on the row, not a different row. */
  selecting?: boolean;
  checked?: boolean;
  onToggle?: (id: string) => void;
}) {
  return (
    <li
      {...inspectable(memory.nodes.row[groupId])}
      data-removing={removing}
      data-memory-id={memory.id}
      className="proto-row"
    >
      <div className="flex items-center">
        {/* The box appears at 8 and the text moves to 48 — the row does not resize,
            the copy makes room. The tick is held against the memory, so a memory
            drawn in two groups shows checked in both and still counts once. */}
        {selecting && <Checkbox checked={checked} />}
        <button
          onClick={() => (selecting ? onToggle?.(memory.id) : onOpen(memory.id))}
          role={selecting ? "checkbox" : undefined}
          aria-checked={selecting ? checked : undefined}
          /* One accessible name, so a row is announced as a sentence rather than as
             two unrelated strings. */
          aria-label={`${memory.text}, ${memory.updatedLabel}`}
          className="flex min-h-[40px] w-full flex-col items-start justify-center gap-[2px] p-[var(--fig-space-8)] text-left"
        >
          <span
            className="proto-text-md-medium w-full truncate"
          >
            {memory.text}
          </span>
          <span
            className="text-[var(--fig-text-secondary)]"
            style={{ font: `400 ${timestampSize}px/${timestampSize === 12 ? 18 : 20}px var(--fig-font-ui)` }}
          >
            {memory.updatedLabel}
          </span>
        </button>
      </div>
    </li>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className="ml-[var(--fig-space-8)] flex size-[24px] shrink-0 items-center justify-center rounded-[var(--fig-radius-xs)] border-2"
      style={{
        borderColor: checked ? "var(--fig-text-primary)" : "var(--fig-new-neutrals-light-grey)",
        background: checked ? "var(--fig-text-primary)" : "transparent",
      }}
    >
      {checked && (
        <svg viewBox="0 0 12 12" className="size-[12px]" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6.2 4.8 8.5 9.5 3.8" />
        </svg>
      )}
    </span>
  );
}

/* ──────────────────────────── Memory details ───────────────────────── */

/**
 * A memory as its own page.
 *
 * It used to be a drawer inset 6px and held 16px off the bottom. The file now pushes a
 * full page with its own back and title, and the fields sit as rows on a card — so this
 * covers the list rather than floating over it, and Delete is fixed at the foot instead
 * of paired with Edit in the drawer.
 */
export function MemoryDetails({
  data,
  memory,
  open,
  onDelete,
  onDismiss,
  pageRef,
}: {
  data: PrototypeData;
  memory: PrototypeMemory | null;
  open: boolean;
  onDelete: () => void;
  onDismiss: () => void;
  pageRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { copy, anchors } = data;

  return (
    <div
      {...inspectable(anchors.page)}
      ref={pageRef}
      role="group"
      aria-label={text(copy.pageTitle)}
      data-open={open}
      className="proto-page z-30 bg-[var(--fig-bg-canvas)]"
    >
      <div
        {...inspectable(anchors.pageNav)}
        className="absolute inset-x-0 top-[54px] flex h-[68px] items-center px-[var(--fig-space-24)]"
      >
        <button
          {...inspectable(anchors.pageBack)}
          onClick={onDismiss}
          aria-label="Back"
          className="proto-glass flex size-[44px] shrink-0 items-center justify-center rounded-full"
        >
          <Glyph name="back" size={16} />
        </button>
        <p
          {...inspectable(anchors.pageTitle)}
          className="proto-text-md-semibold pointer-events-none absolute inset-x-0 text-center"
        >
          {text(copy.pageTitle)}
        </p>
      </div>

      <div className="absolute inset-x-0 top-[146px] flex flex-col gap-[var(--fig-space-24)] px-[var(--fig-space-16)]">
        <div {...inspectable(anchors.pageHeader)} className="flex flex-col gap-[var(--fig-space-8)]">
          <div className="flex flex-col gap-[2px]">
            <p
              {...inspectable(anchors.pageCategory)}
              className="proto-text-sm-medium text-[var(--fig-text-secondary-alt)]"
            >
              {memory?.category.label}
            </p>
            <p {...inspectable(anchors.pageMemoryText)} className="proto-display-xs-semibold">
              {memory?.text}
            </p>
            <p
              {...inspectable(anchors.pageTimestamp)}
              className="proto-text-xs-regular text-[var(--fig-text-tertiary)]"
            >
              {memory?.updatedLabel}
            </p>
          </div>

          <div
            {...inspectable(anchors.pageChip)}
            className="proto-glass flex h-[36px] w-fit items-center gap-[var(--fig-space-8)] rounded-full px-[var(--fig-space-12)]"
          >
            <Glyph name="message" size={16} />
            <span
              {...inspectable(anchors.pageChipText)}
              className="proto-text-sm-medium text-[var(--fig-text-secondary-alt)]"
            >
              Chat history
            </span>
          </div>
        </div>

        {/* Two rows is what the file draws. The field-states section documents up to
            eight for other memory types — see the open question on the screen. */}
        <div
          {...inspectable(anchors.pageFields)}
          className="flex flex-col rounded-[20px] bg-[var(--fig-bg-surface)]"
        >
          <FieldRow nodeId={anchors.pageRowCondition} label="Condition" value={memory?.text ?? ""} />
          <span className="mx-[var(--fig-space-16)] h-px bg-[var(--fig-new-neutrals-light-grey)]" />
          <FieldRow nodeId={anchors.pageRowStatus} label="Status" value="Active" />
        </div>
      </div>

      <button
        {...inspectable(anchors.pageDelete)}
        onClick={onDelete}
        className="proto-glass proto-text-md-semibold absolute inset-x-[var(--fig-space-16)] bottom-[var(--fig-space-16)] flex h-[54px] items-center justify-center rounded-full text-[var(--fig-text-danger)]"
      >
        {text(copy.pageDelete)}
      </button>
    </div>
  );
}

function FieldRow({ nodeId, label, value }: { nodeId: string; label: string; value: string }) {
  return (
    <div
      {...inspectable(nodeId)}
      className="flex h-[54px] items-center justify-between gap-[var(--fig-space-16)] px-[var(--fig-space-16)]"
    >
      <span className="proto-text-sm-medium shrink-0 text-[var(--fig-text-secondary)]">{label}</span>
      <span className="proto-text-md-medium min-w-0 flex-1 truncate text-right">{value}</span>
    </div>
  );
}

/* ─────────────────────────── Delete dialog ─────────────────────────── */

export function DeleteDialog({
  data,
  open,
  onCancel,
  onConfirm,
  dialogRef,
  title,
  body,
  listing,
}: {
  data: PrototypeData;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  dialogRef: React.RefObject<HTMLDivElement | null>;
  /** Overridden for a selection, which is plural and names what is going. */
  title?: string;
  body?: string;
  listing?: string[];
}) {
  const { copy, anchors } = data;

  return (
    <>
      <div className="proto-scrim z-40" data-open={open} onClick={onCancel} aria-hidden />

      <div
        {...inspectable(anchors.dialog)}
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="proto-dialog-title"
        aria-describedby="proto-dialog-body"
        data-open={open}
        className="proto-dialog z-50 flex flex-col justify-center gap-[var(--fig-space-24)] rounded-[var(--fig-radius-4xl)] border-2 border-[var(--fig-new-neutrals-white)] bg-[var(--fig-bg-surface)] p-[var(--fig-space-24)]"
      >
        <div {...inspectable(anchors.dialogText)} className="flex flex-col gap-[var(--fig-space-4)]">
          <h2 id="proto-dialog-title" className="proto-text-lg-semibold">
            {title ?? text(copy.dialogTitle)}
          </h2>
          <p id="proto-dialog-body" className="proto-text-md-medium text-[var(--fig-text-secondary)]">
            {body ?? text(copy.dialogBody)}
          </p>
          {listing && listing.length > 0 && (
            <ul className="mt-[var(--fig-space-8)] flex flex-col gap-[2px]">
              {listing.map((line) => (
                <li key={line} className="proto-text-sm-regular truncate text-[var(--fig-text-secondary-alt)]">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div {...inspectable(anchors.dialogButtons)} className="flex items-start gap-[var(--fig-space-8)]">
          <button
            onClick={onCancel}
            className="proto-glass proto-text-md-semibold flex h-[48px] flex-1 items-center justify-center rounded-[48px] px-[var(--fig-space-16)]"
          >
            {text(copy.dialogCancel)}
          </button>
          <button
            onClick={onConfirm}
            className="proto-text-md-semibold flex h-[48px] flex-1 items-center justify-center rounded-[40px] border-2 border-white px-[var(--fig-space-16)] text-[var(--fig-text-inverse)]"
            /* Not a token. Two stacked gradients, verbatim from Figma. */
            style={{
              backgroundImage:
                "linear-gradient(180deg, #FFFFFF33 0%, #FFFFFF00 100%), linear-gradient(90deg, #CC323A 0%, #CC323A 100%)",
              boxShadow: "0 0 8px 0 rgba(154,34,40,0.25)",
            }}
          >
            {text(copy.dialogConfirm)}
          </button>
        </div>
      </div>
    </>
  );
}
