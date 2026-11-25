import type { PrototypeData, PrototypeMemory } from "@/lib/prototype";

/**
 * The prototype's app state. Pure, so a key moment can rebuild it from scratch and a
 * reset is just `init(data)` — which matters for something people click through
 * repeatedly in a demo.
 */

export type Overlay =
  | { kind: "none" }
  | { kind: "detail"; memoryId: string }
  | { kind: "confirm"; memoryId: string }
  /** The same gate for a selection. The file gives it its own copy and lists what goes. */
  | { kind: "confirmBulk" };

export type State = {
  memories: PrototypeMemory[];
  /**
   * Selection mode, and what is ticked. Held as memory ids rather than row ids, because
   * a memory drawn in two groups is one choice — ticking it ticks both rows and counts
   * once, which is what the file's own count does.
   */
  selecting: boolean;
  selected: string[];
  /** Kept so a delete can be undone, and so Reset can tell what changed. */
  removed: { memory: PrototypeMemory; index: number; alsoDeletedChat: boolean }[];
  /** Still rendered, mid-collapse. Splicing it out immediately would kill the animation. */
  exitingId: string | null;
  overlay: Overlay;
  toast: { message: string; undo: boolean } | null;
};

export type Action =
  | { type: "START_SELECTING" }
  | { type: "STOP_SELECTING" }
  | { type: "TOGGLE_SELECTED"; memoryId: string }
  | { type: "SELECT_ALL" }
  | { type: "OPEN_DETAIL"; memoryId: string }
  | { type: "CLOSE_OVERLAY" }
  | { type: "REQUEST_DELETE" }
  | { type: "CONFIRM_DELETE" }
  | { type: "COMMIT_REMOVAL"; memoryId: string }
  | { type: "UNDO" }
  | { type: "RESET"; data: PrototypeData }
  | { type: "GOTO_MOMENT"; momentId: string; data: PrototypeData };

export function init(data: PrototypeData): State {
  return {
    memories: data.memories,
    selecting: false,
    selected: [],
    removed: [],
    exitingId: null,
    overlay: { kind: "none" },
    toast: null,
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START_SELECTING":
      return { ...state, selecting: true, selected: [], overlay: { kind: "none" }, toast: null };

    case "STOP_SELECTING":
      return { ...state, selecting: false, selected: [] };

    case "TOGGLE_SELECTED": {
      const on = state.selected.includes(action.memoryId);
      return {
        ...state,
        selected: on
          ? state.selected.filter((id) => id !== action.memoryId)
          : [...state.selected, action.memoryId],
      };
    }

    /** All, or none if everything is already ticked — the bar reads Deselect all then. */
    case "SELECT_ALL":
      return {
        ...state,
        selected:
          state.selected.length === state.memories.length
            ? []
            : state.memories.map((m) => m.id),
      };

    case "OPEN_DETAIL":
      return { ...state, overlay: { kind: "detail", memoryId: action.memoryId }, toast: null };

    case "CLOSE_OVERLAY":
      return { ...state, overlay: { kind: "none" } };

    case "REQUEST_DELETE":
      if (state.selecting) {
        if (state.selected.length === 0) return state;
        return { ...state, overlay: { kind: "confirmBulk" } };
      }
      if (state.overlay.kind !== "detail") return state;
      return {
        ...state,
        overlay: { kind: "confirm", memoryId: state.overlay.memoryId },
      };

    case "CONFIRM_DELETE": {
      /* A selection goes in one step: there is no per-row collapse to wait on when
         several rows leave at once, so the removal commits here. */
      if (state.overlay.kind === "confirmBulk") {
        const going = new Set(state.selected);
        const removed = state.memories
          .map((memory, index) => ({ memory, index }))
          .filter(({ memory }) => going.has(memory.id))
          .map((r) => ({ ...r, alsoDeletedChat: false }));
        return {
          ...state,
          memories: state.memories.filter((m) => !going.has(m.id)),
          removed: [...state.removed, ...removed],
          selecting: false,
          selected: [],
          overlay: { kind: "none" },
          toast: {
            message: `${going.size} ${going.size === 1 ? "memory" : "memories"} deleted`,
            undo: true,
          },
        };
      }
      if (state.overlay.kind !== "confirm") return state;
      return {
        ...state,
        exitingId: state.overlay.memoryId,
        overlay: { kind: "none" },
      };
    }

    case "COMMIT_REMOVAL": {
      // Ignore a late event for a row that is no longer the one exiting.
      if (state.exitingId !== action.memoryId) return state;

      const index = state.memories.findIndex((m) => m.id === action.memoryId);
      if (index === -1) return { ...state, exitingId: null };

      return {
        ...state,
        memories: state.memories.filter((m) => m.id !== action.memoryId),
        removed: [
          ...state.removed,
          { memory: state.memories[index], index, alsoDeletedChat: false },
        ],
        exitingId: null,
        toast: { message: "Memory deleted", undo: true },
      };
    }

    case "UNDO": {
      const last = state.removed.at(-1);
      if (!last) return state;

      const memories = [...state.memories];
      memories.splice(last.index, 0, last.memory);

      return {
        ...state,
        memories,
        removed: state.removed.slice(0, -1),
        toast: null,
      };
    }

    case "RESET":
      return init(action.data);

    /**
     * Rebuilt from scratch rather than applied on top, so bouncing between moments
     * never accumulates deletions.
     */
    case "GOTO_MOMENT": {
      const base = init(action.data);
      const subject = action.data.memories.find((m) => m.id === "mem-penicillin") ?? action.data.memories[0];

      switch (action.momentId) {
        /* Three ticked, matching the frame — and one of them is drawn in two groups,
           so the list shows four ticks against a count of three. */
        case "selecting":
          return {
            ...base,
            selecting: true,
            selected: base.memories.slice(2, 5).map((m) => m.id),
          };
        case "detail":
          return { ...base, overlay: { kind: "detail", memoryId: subject.id } };
        case "confirm":
          return {
            ...base,
            overlay: { kind: "confirm", memoryId: subject.id },
          };
        case "deleted":
          return {
            ...base,
            memories: base.memories.filter((m) => m.id !== subject.id),
            removed: [
              {
                memory: subject,
                index: base.memories.findIndex((m) => m.id === subject.id),
                alsoDeletedChat: false,
              },
            ],
            toast: { message: "Memory deleted", undo: true },
          };
        default:
          return base;
      }
    }

    default:
      return state;
  }
}

/** Which key moment the live state corresponds to, so the rail can follow the user. */
export function currentMomentId(state: State): string {
  if (state.overlay.kind === "confirm") return "confirm";
  if (state.overlay.kind === "detail") return "detail";
  if (state.selecting) return "selecting";
  if (state.removed.length > 0) return "deleted";
  return "browse";
}

/** What the count says: memories ticked, not rows — a memory in two groups counts once. */
export function selectedCount(state: State): number {
  return state.selected.length;
}

/** Memories in a group, in data order, including one that is mid-collapse. */
export function memoriesInGroup(state: State, groupId: string): PrototypeMemory[] {
  return state.memories.filter((m) => m.groupIds.includes(groupId));
}
