"use client";

import { useEffect, useRef, useState } from "react";
import { GLASS, Glyph, ICON } from "@/components/screens/parts";
import { cn } from "@/lib/utils";
import { useInspectState, InspectLayer, inspectable } from "./inspect";

/**
 * The route into Chat settings, and the two destructive actions once you are there.
 *
 * Six frames in the file draw this as stills — the panel with its new Settings link, the
 * settings page, the toggle before and after, the confirm dialog with and without the
 * keyboard, and the page with both deletes spent. What they cannot show is the part that
 * matters: that the confirmation is a real gate, and that deleting is a one-way door.
 * So this runs it.
 *
 * The gate is honest. The Delete button enables on what has actually been typed, not on
 * a timer, and the demo uses the same string the file does. Deleting a list disables that
 * row for the rest of the session, because that is what the last frame draws.
 */

const ICONS = "/demos/loblaw-handoff/icons/chat-settings";

/**
 * The Settings screen’s parts, and the node each was built from.
 *
 * Taken from `Settings, on surface` in the file. The four Chat settings frames are not
 * extracted, so there is no layer tree to walk — what Inspect can say is which node a
 * part came from, the size it is drawn at there, and the size it measures here. Where
 * those two disagree, the measured one is what was built.
 */
const NODES = {
  title:      { id: "8144:62543", label: "Page title",        figma: "62×22" },
  back:       { id: "8144:62540", label: "Back",              figma: "44×44" },
  chatGroup:  { id: "8144:62546", label: "Section — Chat history", figma: "97×20" },
  autoLabel:  { id: "8144:62550", label: "Auto-delete label", figma: "181×22" },
  autoBody:   { id: "8144:62552", label: "Auto-delete copy",  figma: "285×80" },
  switch:     { id: "8144:62553", label: "Switch",            figma: "64×28" },
  deleteChats:{ id: "8144:62555", label: "Delete all previous chats", figma: "361×54" },
  memGroup:   { id: "8144:62557", label: "Section — Memory",  figma: "66×20" },
  deleteMems: { id: "8144:62559", label: "Delete all memories", figma: "361×54" },
} as const;

type NodeRef = { id: string; label: string; figma: string };
const BY_ID = new Map<string, NodeRef>(Object.values(NODES).map((n) => [n.id, n]));

const FIGMA_FILE = "yIzE3IWqhgtCP2Fo44aAvp";

type Screen = "conversation" | "settings";
type Dialog = null | "chats" | "memories";

const COPY = {
  chats: {
    row: "Delete all previous chats",
    title: "Delete all previous chats?",
    body: "All your chats will be permanently deleted. Any memories saved from them will still be used unless you delete them too.",
    done: "All chats deleted",
  },
  memories: {
    row: "Delete all memories",
    title: "Delete all memories?",
    body: "All memories will be permanently deleted. If you share the details again, we’ll save them as new memories. Your chat history stays.",
    done: "All memories deleted",
  },
} as const;

/** The file's own wording. Matched rather than loosened — the gate is the point. */
const CONFIRM_WORD = "delete";

const RECENTS = [
  { title: "GLP-1 medications and heart health concerns", when: "Yesterday" },
  { title: "Recipes for a summer dinner party", when: "Yesterday" },
  { title: "Managing nausea after medication dose increase", when: "3 days ago" },
  { title: "Plan my groceries for the week", when: "2 weeks ago" },
];

export function ChatSettingsTryIt() {
  const [screen, setScreen] = useState<Screen>("conversation");
  const [panelOpen, setPanelOpen] = useState(false);
  const [autoDelete, setAutoDelete] = useState(true);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [confirm, setConfirm] = useState("");
  const [typing, setTyping] = useState(false);
  const [gone, setGone] = useState({ chats: false, memories: false });
  const [toast, setToast] = useState<string | null>(null);

  const inspect = useInspectState();
  const frameRef = useRef<HTMLDivElement>(null);
  const [scrollKey, setScrollKey] = useState(0);

  const menuButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmed = confirm.trim().toLowerCase() === CONFIRM_WORD;

  const closeDialog = () => {
    setDialog(null);
    setConfirm("");
    setTyping(false);
  };

  // Escape backs out of whichever layer is on top.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (dialog) closeDialog();
      else if (panelOpen) setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, panelOpen]);

  // The toast clears itself, as it would in the app.
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (panelOpen) panel.current?.focus();
  }, [panelOpen]);

  // Focus the dialog, not the field. The keyboard is meant to arrive when the user
  // goes to the field, so nothing may put a caret there on their behalf.
  useEffect(() => {
    if (dialog) dialogRef.current?.focus();
  }, [dialog]);

  function toggleAutoDelete() {
    const next = !autoDelete;
    setAutoDelete(next);
    setToast(next ? "Auto-delete for chats enabled" : "Auto-delete for chats disabled");
  }

  function runDelete() {
    if (!dialog || !confirmed) return;
    const which = dialog;
    setGone((g) => ({ ...g, [which]: true }));
    setToast(COPY[which].done);
    closeDialog();
  }

  function reset() {
    setScreen("conversation");
    setPanelOpen(false);
    setAutoDelete(true);
    setGone({ chats: false, memories: false });
    setToast(null);
    closeDialog();
  }

  /**
   * Inspect is about the Settings screen, and the demo opens on the conversation.
   * Switching modes takes you there rather than leaving you to find it — and closes
   * whatever is over it, since a dialog or an open panel is not what you came to read.
   */
  function setMode(next: "use" | "inspect") {
    if (next === "inspect") {
      setScreen("settings");
      setPanelOpen(false);
      closeDialog();
      setToast(null);
    }
    inspect.setMode(next);
  }

  const inspecting = inspect.mode === "inspect";
  const selected = inspect.selectedId ? BY_ID.get(inspect.selectedId) : undefined;
  const onSettings = screen === "settings";

  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="flex items-center gap-1">
        {(["use", "inspect"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "cursor-pointer rounded-[5px] px-2.5 py-1 text-[13px] transition-colors",
              inspect.mode === m ? "bg-ink text-white" : "text-ink-3 hover:text-ink"
            )}
          >
            {m === "use" ? "Use" : "Inspect"}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-start gap-6 xl:flex-row">
      <div
        ref={frameRef}
        {...inspect.handlers}
        onScrollCapture={() => setScrollKey((k) => k + 1)}
        className={cn("proto relative overflow-hidden", inspecting && "cursor-crosshair")}
        style={{
          width: 393,
          height: 852,
          borderRadius: 48,
          backgroundImage: BACKDROP_GRADIENT,
          backgroundSize: "100% 100%",
        }}
      >
        {/* ── The conversation ─────────────────────────────────────────── */}
        {!onSettings && (
          <div className="absolute inset-0" inert={panelOpen}>
            <div
              className="absolute left-0 right-0 flex items-center justify-between"
              style={{ top: 54, height: 68, paddingLeft: 24, paddingRight: 24 }}
            >
              <button
                ref={menuButton}
                type="button"
                onClick={() => setPanelOpen(true)}
                aria-expanded={panelOpen}
                aria-controls="chat-settings-panel"
                className="flex shrink-0 cursor-pointer items-center justify-center overflow-hidden"
                style={{ ...GLASS, width: 48, height: 48, borderRadius: 48, padding: 4 }}
              >
                <Glyph src={`${ICON}/nav-menu.svg`} size={24} />
                <span className="sr-only">Open the side panel</span>
              </button>
              <span
                className="flex shrink-0 items-center justify-center overflow-hidden"
                style={{ ...GLASS, width: 48, height: 48, borderRadius: 48, padding: 4 }}
              >
                <Glyph src={`${ICON}/nav-close.svg`} size={24} />
              </span>
            </div>

            <div
              className="absolute left-0 right-0 flex flex-col items-start"
              style={{ top: 122, gap: 24, paddingLeft: 16, paddingRight: 16 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${ICON}/pc-chat-mark-40.svg`} alt="" width={40} height={40} className="block shrink-0" />
              <p
                className="w-full shrink-0"
                style={{ font: "600 28px/38px var(--fig-font-display)", color: "var(--fig-text-primary)" }}
              >
                Hi Jane,
                <br />
                What&rsquo;s on your mind?
              </p>
            </div>

            <div
              className="absolute left-0 right-0 flex flex-col items-start justify-end"
              style={{ top: 726, paddingBottom: 32, paddingLeft: 16, paddingRight: 16 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${ICON}/composer.svg`} alt="" width={361} height={94} className="block w-full shrink-0" />
            </div>
          </div>
        )}

        {/* ── Chat settings ────────────────────────────────────────────── */}
        {onSettings && (
          <div className="absolute inset-0" inert={dialog !== null}>
            <div
              className="absolute left-0 right-0 flex items-center"
              style={{ top: 54, height: 68, paddingLeft: 24, paddingRight: 24 }}
            >
              <button
                type="button"
                onClick={() => setScreen("conversation")}
                {...inspectable(NODES.back.id)}
                className="flex shrink-0 cursor-pointer items-center justify-center overflow-hidden"
                style={{ ...GLASS, width: 44, height: 44, borderRadius: 44 }}
              >
                <Glyph src="/demos/loblaw-handoff/icons/chat-history/nav-back.svg" size={16} />
                <span className="sr-only">Back</span>
              </button>
              <p
                {...inspectable(NODES.title.id)}
                className="pointer-events-none absolute left-0 right-0 text-center"
                style={{ font: "var(--fig-text-md-semibold)", color: "var(--fig-text-primary)" }}
              >
                Settings
              </p>
            </div>

            <div
              className="absolute left-0 right-0 flex flex-col items-start"
              style={{ top: 146, gap: 8, paddingLeft: 16, paddingRight: 16 }}
            >
              <SectionTitle nodeId={NODES.chatGroup.id}>Chat history</SectionTitle>

              <div className="flex w-full items-start" style={{ gap: 16, paddingTop: 8, paddingBottom: 16 }}>
                <div className="min-w-0 flex-1">
                  <p
                    {...inspectable(NODES.autoLabel.id)}
                    style={{ font: "var(--fig-text-md-semibold)", color: "var(--fig-text-primary)" }}
                  >
                    Auto-delete after 60 days
                  </p>
                  <p
                    {...inspectable(NODES.autoBody.id)}
                    className="mt-1"
                    style={{ font: "var(--fig-text-md-regular)", color: "var(--fig-text-secondary)" }}
                  >
                    When this is on, chats are permanently deleted after 60 days. When it’s off, chats are kept for
                    550 days, then permanently deleted.
                  </p>
                </div>
                <Switch
                  on={autoDelete}
                  onChange={toggleAutoDelete}
                  label="Auto-delete for chats"
                  nodeId={NODES.switch.id}
                />
              </div>

              <DeleteRow
                label={COPY.chats.row}
                spent={gone.chats}
                onClick={() => setDialog("chats")}
                nodeId={NODES.deleteChats.id}
              />

              <div className="w-full" style={{ height: 24 }} />
              <SectionTitle nodeId={NODES.memGroup.id}>Memory</SectionTitle>
              <DeleteRow
                label={COPY.memories.row}
                spent={gone.memories}
                onClick={() => setDialog("memories")}
                nodeId={NODES.deleteMems.id}
              />
            </div>
          </div>
        )}

        {/* ── The side panel, now carrying Settings ────────────────────── */}
        <button
          type="button"
          onClick={() => setPanelOpen(false)}
          tabIndex={panelOpen ? 0 : -1}
          aria-hidden={!panelOpen}
          className="proto-scrim cursor-pointer"
          data-open={panelOpen}
        >
          <span className="sr-only">Close the side panel</span>
        </button>

        <div
          id="chat-settings-panel"
          ref={panel}
          tabIndex={-1}
          role="group"
          aria-label="Side panel"
          className="proto-panel outline-none"
          data-open={panelOpen}
        >
          <SidePanel
            onSettings={() => {
              setPanelOpen(false);
              setScreen("settings");
            }}
          />
        </div>

        {/* ── The confirm dialog, and the keyboard it makes room for ───── */}
        <div className="proto-scrim" data-open={dialog !== null} aria-hidden={dialog === null} />

        {dialog && (
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={COPY[dialog].title}
            className="absolute flex flex-col outline-none"
            style={{
              left: 16,
              right: 16,
              // The dialog rides above the keyboard when one is up, exactly as the file draws it.
              top: typing ? 196 : 300,
              gap: 24,
              padding: 24,
              borderRadius: 32,
              background: "var(--fig-bg-surface)",
              transition: "top var(--proto-dur-sheet-in) var(--proto-ease-sheet)",
            }}
          >
            <div>
              <p style={{ font: "var(--fig-text-lg-semibold)", color: "var(--fig-text-primary)" }}>
                {COPY[dialog].title}
              </p>
              <p className="mt-2" style={{ font: "var(--fig-text-md-regular)", color: "var(--fig-text-secondary)" }}>
                {COPY[dialog].body}
              </p>
            </div>

            <div>
              <label
                htmlFor="chat-settings-confirm"
                className="block"
                style={{ font: "var(--fig-text-sm-medium)", color: "var(--fig-text-secondary)" }}
              >
                Type Delete to confirm
              </label>
              <input
                id="chat-settings-confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onFocus={() => setTyping(true)}
                placeholder="Delete"
                autoComplete="off"
                className="mt-2 w-full outline-none"
                style={{
                  height: 48,
                  padding: "0 16px",
                  borderRadius: 16,
                  background: "var(--fig-bg-canvas)",
                  font: "var(--fig-text-md-regular)",
                  color: "var(--fig-text-primary)",
                }}
              />
            </div>

            <div className="flex items-center" style={{ gap: 8 }}>
              <button
                type="button"
                onClick={closeDialog}
                className="flex-1 cursor-pointer"
                style={{
                  height: 48,
                  borderRadius: 999,
                  background: "var(--fig-bg-canvas)",
                  font: "var(--fig-text-md-semibold)",
                  color: "var(--fig-text-primary)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runDelete}
                disabled={!confirmed}
                className={confirmed ? "flex-1 cursor-pointer" : "flex-1"}
                style={{
                  height: 48,
                  borderRadius: 999,
                  // Disabled is the same red held back, not a grey — the action stays legible
                  // as the destructive one while it is out of reach.
                  background: confirmed ? "var(--fig-text-danger)" : "rgba(163,20,12,0.35)",
                  font: "var(--fig-text-md-semibold)",
                  color: "var(--fig-text-inverse)",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {dialog && typing && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${ICONS}/keyboard.png`}
            alt=""
            width={393}
            height={317}
            className="pointer-events-none absolute left-0 block"
            style={{ top: 852 - 317 }}
          />
        )}

        {/* ── Toast ───────────────────────────────────────────────────── */}
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{
            top: 60,
            opacity: toast ? 1 : 0,
            translate: toast ? "0 0" : "0 -8px",
            visibility: toast ? "visible" : "hidden",
            transition:
              "opacity var(--proto-dur-scrim) linear, translate var(--proto-dur-scrim) var(--proto-ease-out), visibility 0s linear " +
              (toast ? "0s" : "var(--proto-dur-scrim)"),
          }}
          aria-live="polite"
        >
          {/* The file's Toast, at the size it is drawn: 361 wide inside the 393 frame,
              8px padding all round, the message 24 in from the edge at 12/Semibold, and
              a glass dismiss rather than a solid one. The Undo action the component
              carries is switched off in the frames, so it is not drawn here either. */}
          <div
            className="flex items-center justify-between"
            style={{
              width: 361,
              height: 56,
              padding: 8,
              borderRadius: 32,
              gap: 8,
              background: "var(--fig-bg-surface-translucent)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              boxShadow: "0 4px 20px 0 rgba(113,117,142,0.25)",
            }}
          >
            <p
              className="min-w-0 flex-1 truncate"
              style={{
                paddingLeft: 16,
                font: "var(--fig-text-xs-semibold)",
                color: "var(--fig-text-primary)",
              }}
            >
              {toast}
            </p>
            <button
              type="button"
              onClick={() => setToast(null)}
              tabIndex={toast ? 0 : -1}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full"
              style={{
                background: "rgba(255,255,255,0.4)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              <Glyph src={`${ICON}/nav-close.svg`} size={16} />
              <span className="sr-only">Dismiss</span>
            </button>
          </div>
        </div>

        <InspectLayer
          frameRef={frameRef}
          selectedId={inspect.selectedId}
          hoveredId={inspect.hoveredId}
          scrollKey={scrollKey}
        />
      </div>

      {inspecting && (
        <SettingsInspector node={selected} onClose={() => inspect.setSelectedId(null)} />
      )}
      </div>

      <div className="flex max-w-[62ch] flex-col gap-3">
        <p className="text-[13px] leading-[1.6] text-ink-3">
          Open the menu, take <span className="text-ink">Settings</span>, then try the toggle and either delete. The
          confirmation is real — <span className="text-ink">Delete</span> stays out of reach until the field says{" "}
          <span className="literal">Delete</span>, and once a list is gone its row is spent for the rest of the session,
          which is what the last frame draws.
        </p>
        <div>
          <button
            type="button"
            onClick={reset}
            className="cursor-pointer rounded-full border border-rule px-3 py-1.5 text-[13px] text-ink-2 hover:border-rule-strong"
          >
            Start over
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * What Inspect can honestly say about a part of this screen.
 *
 * The Chat settings frames are not extracted, so there is no layer tree behind them and
 * no open questions filed against individual nodes. What there is: the node each part
 * was built from, the size it is drawn at in the file, and the size it measures here.
 * Those last two are reported side by side rather than reconciled — where they differ,
 * the measured one is what was built.
 */
function SettingsInspector({
  node,
  onClose,
}: {
  node: NodeRef | undefined;
  onClose: () => void;
}) {
  const [built, setBuilt] = useState<string | null>(null);

  useEffect(() => {
    if (!node) {
      setBuilt(null);
      return;
    }
    const el = document.querySelector(`[data-node-id="${node.id}"]`);
    if (!el) {
      setBuilt(null);
      return;
    }
    const b = el.getBoundingClientRect();
    setBuilt(`${Math.round(b.width)}\u00d7${Math.round(b.height)}`);
  }, [node]);

  return (
    <aside className="instrument flex w-full flex-col overflow-hidden xl:w-[320px]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-rule px-4 py-3">
        <h3 className="label">Inspector</h3>
        {node && (
          <button
            type="button"
            onClick={onClose}
            className="literal cursor-pointer rounded border border-rule px-2 py-0.5 text-ink-3 transition-colors hover:border-rule-strong hover:text-ink"
          >
            close
          </button>
        )}
      </header>

      {!node ? (
        <p className="px-4 py-4 text-[13px] leading-[1.6] text-ink-3">
          Pick any part of the Settings screen to see the node it was built from and the
          size it is drawn at.
        </p>
      ) : (
        <div className="flex flex-col gap-3 px-4 py-4">
          <p className="text-[15px] font-medium text-ink">{node.label}</p>

          <dl className="flex flex-col gap-2 text-[13px]">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-3">In the file</dt>
              <dd className="literal text-ink">{node.figma}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-3">Built</dt>
              <dd className="literal text-ink">{built ?? "\u2014"}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-3">Node</dt>
              <dd className="literal text-ink">{node.id}</dd>
            </div>
          </dl>

          <a
            href={`https://www.figma.com/design/${FIGMA_FILE}/?node-id=${node.id.replace(":", "-")}`}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] text-measure underline-offset-2 hover:underline"
          >
            Open in Figma
          </a>
        </div>
      )}
    </aside>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────── */

function SectionTitle({ children, nodeId }: { children: string; nodeId?: string }) {
  return (
    <p
      {...inspectable(nodeId)}
      className="w-full"
      style={{ font: "var(--fig-text-lg-semibold)", color: "var(--fig-text-primary)" }}
    >
      {children}
    </p>
  );
}

function Switch({
  on,
  onChange,
  label,
  nodeId,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
  nodeId?: string;
}) {
  return (
    <button
      type="button"
      {...inspectable(nodeId)}
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className="relative shrink-0 cursor-pointer"
      style={{
        width: 64,
        height: 28,
        borderRadius: 999,
        // Loblaw green on, the neutral ramp off — both read off the file.
        background: on ? "rgb(0,153,81)" : "rgb(171,177,201)",
        transition: "background var(--proto-dur-scrim) linear",
      }}
    >
      <span className="sr-only">{label}</span>
      <span
        aria-hidden
        className="absolute block"
        style={{
          top: 2.5,
          left: on ? 23 : 3,
          width: 38,
          height: 23,
          borderRadius: 999,
          background: "#fff",
          transition: "left var(--proto-dur-scrim) var(--proto-ease-out)",
        }}
      />
    </button>
  );
}

function DeleteRow({
  label,
  spent,
  onClick,
  nodeId,
}: {
  label: string;
  spent: boolean;
  onClick: () => void;
  nodeId?: string;
}) {
  return (
    <button
      type="button"
      {...inspectable(nodeId)}
      onClick={onClick}
      disabled={spent}
      aria-label={spent ? `${label} — already deleted` : label}
      className={`flex w-full shrink-0 items-center justify-center ${spent ? "" : "cursor-pointer"}`}
      style={{
        gap: 8,
        height: 54,
        borderRadius: 999,
        background: "var(--fig-bg-white-subtle)",
        border: "2px solid var(--fig-new-neutrals-white, #fff)",
        boxShadow: "0 0 13px 0 rgba(0,0,0,0.05), 0 0 4px 0 rgba(0,0,0,0.08)",
        color: "var(--fig-text-danger)",
        opacity: spent ? 0.4 : 1,
        transition: "opacity var(--proto-dur-scrim) linear",
      }}
    >
      <Glyph src={`${ICONS}/trash.svg`} size={16} />
      <span style={{ font: "var(--fig-text-md-semibold)" }}>{label}</span>
    </button>
  );
}

function SidePanel({ onSettings }: { onSettings: () => void }) {
  return (
    <div
      className="flex flex-col items-center overflow-hidden"
      style={{
        width: 330,
        height: 852,
        paddingTop: 52,
        borderRadius: 40,
        background: "var(--fig-bg-canvas)",
        boxShadow: "0 4px 20px 0 rgba(113,117,142,0.25)",
      }}
    >
      <div className="flex w-full shrink-0 items-center" style={{ paddingTop: 24, paddingLeft: 24, paddingRight: 24 }}>
        <div className="flex shrink-0 items-center" style={{ gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ICON}/pc-chat-mark-24.svg`} alt="" width={24} height={24} className="block" />
          <p style={{ font: "600 20px/23.75px var(--fig-font-display)", color: "var(--fig-text-primary)" }}>PC Chat</p>
        </div>
      </div>

      <div
        className="flex w-full min-h-0 flex-1 flex-col items-start"
        style={{ gap: 24, paddingTop: 24, paddingBottom: 24, paddingLeft: 8, paddingRight: 8 }}
      >
        <div className="flex w-full shrink-0 flex-col items-start">
          <NavItem icon={`${ICON}/nav-new-chat.svg`} label="New chat" />
          <NavItem icon={`${ICON}/nav-chat-history.svg`} label="Chat history" />
          <NavItem icon={`${ICON}/nav-memory.svg`} label="Memory" />
          <NavItem icon={`${ICONS}/nav-settings.svg`} label="Settings" onClick={onSettings} />
        </div>

        <div className="flex w-full shrink-0 flex-col items-start" style={{ gap: 8 }}>
          <div className="flex w-full shrink-0 items-center" style={{ paddingLeft: 8, paddingRight: 8 }}>
            <p style={{ font: "var(--fig-text-md-semibold)", color: "var(--fig-text-primary)" }}>Recents</p>
          </div>
          <div className="flex w-full shrink-0 flex-col items-start" style={{ gap: 4 }}>
            {RECENTS.map((r) => (
              <div
                key={r.title}
                className="flex w-full shrink-0 items-center"
                style={{ gap: 16, padding: 8, borderRadius: 16, minHeight: 40 }}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate"
                    style={{ font: "var(--fig-text-md-regular)", color: "var(--fig-text-primary)" }}
                  >
                    {r.title}
                  </p>
                  <p style={{ font: "var(--fig-text-sm-regular)", color: "var(--fig-text-secondary)" }}>{r.when}</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ICON}/overflow-more.svg`} alt="" width={16} height={16} className="block shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  const inner = (
    <>
      <span
        className="flex shrink-0 flex-col items-center justify-center"
        style={{ width: 24, height: 24, color: "var(--fig-icon-default)" }}
      >
        <Glyph src={icon} size={24} />
      </span>
      <span style={{ font: "var(--fig-text-md-semibold)", color: "var(--fig-text-primary)" }}>{label}</span>
    </>
  );
  const style = { gap: 8, padding: 8, borderRadius: 8 } as const;

  return onClick ? (
    <button type="button" onClick={onClick} className="flex w-full shrink-0 cursor-pointer items-center" style={style}>
      {inner}
    </button>
  ) : (
    <div className="flex w-full shrink-0 items-center" style={style}>
      {inner}
    </div>
  );
}

/**
 * Figma's own radial gradient, kept as the SVG the file emits rather than re-expressed as
 * a CSS radial-gradient — the transform matrix carries a rotation and a non-uniform scale
 * that CSS cannot state without rounding it into something else.
 */
const BACKDROP_GRADIENT =
  "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 393 852' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%25' width='100%25' fill='url(%23g)'/><defs><radialGradient id='g' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(3.6605e-16 -41.528 68.995 1.6479e-7 204.32 871.5)'><stop stop-color='rgb(255,222,229)' offset='0'/><stop stop-color='rgb(245,246,250)' offset='0.6'/></radialGradient></defs></svg>\")";
