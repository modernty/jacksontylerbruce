import type { LayerNode } from "@/lib/content";

/**
 * Read a rebuilt screen's geometry off the DOM.
 *
 * Every node in a live screen is an element carrying `data-node-id`, so its box is
 * whatever the browser actually laid out — there is no second copy of the geometry to
 * drift from the first. Rects are divided back through the stage's scale so the numbers
 * reported are Figma pixels at 1x, which is what the inspector and the annotations show.
 *
 * Parentage comes from the DOM too: a node's parent is the nearest ancestor that also
 * carries `data-node-id`, which is exactly the relationship the layer tree describes.
 */
export function measureLiveNodes(root: HTMLElement, scale: number): LayerNode[] {
  const origin = root.getBoundingClientRect();
  const elements = Array.from(root.querySelectorAll<HTMLElement>("[data-node-id]"));

  // The stage element itself carries the root node id and is not inside the query.
  const all = root.dataset.nodeId ? [root, ...elements] : elements;

  const depthOf = new Map<string, number>();

  return all.map((el) => {
    const box = el.getBoundingClientRect();
    const parentEl = el.parentElement?.closest<HTMLElement>("[data-node-id]") ?? null;
    const parentId = parentEl && parentEl !== el ? (parentEl.dataset.nodeId ?? null) : null;
    const id = el.dataset.nodeId!;
    const depth = parentId ? (depthOf.get(parentId) ?? 0) + 1 : 0;
    depthOf.set(id, depth);

    return {
      id,
      name: el.dataset.name ?? id,
      type: el.dataset.type ?? "FRAME",
      parentId,
      depth,
      bounds: {
        x: round2((box.left - origin.left) / scale),
        y: round2((box.top - origin.top) / scale),
        width: round2(box.width / scale),
        height: round2(box.height / scale),
      },
      hidden: false,
      // Anything with a child node is a section: the drill-down then starts at the
      // outermost containers and walks in, the same rule the exported screens use.
      isSection: false,
    } satisfies LayerNode;
  });
}

/**
 * Decide what a first click lands on.
 *
 * Starting at the outermost containers and drilling in is right for a screen you are
 * exploring and wrong for one you are reading: reaching a chat row meant clicking the
 * panel, its content, the stack and the list before you got to the row. What a reader
 * wants is the component, so that is what a first click selects.
 *
 * The complication is that the file wraps some rows in a scaffolding frame the same size
 * as the row and leaves others bare, so a list's children are a mix of rows and wrappers.
 * Each child is therefore resolved to the node that actually matters — down through any
 * chain of single children occupying the same box — and the repeat test runs on those.
 * Without that, a list holding one bare row and three wrapped ones sees the bare row as
 * unique and leaves it unselectable, which is exactly what happened.
 *
 * A resolved node qualifies when it has children and either
 *
 *   - its name repeats among its resolved siblings, which is what a repeated component
 *     looks like from the outside, or
 *   - it sits in the top two levels, so the regions of the screen stay reachable where no
 *     component covers them.
 *
 * Nodes inside a repeated component are left out, or the row's own Text and Metadata
 * would take the click the row should have. They are one drill-in away.
 *
 * Deeper nodes are painted later and therefore win the click, so the row wins over the
 * panel, and selecting a row opens its contents to the next click.
 */
export function withSections(nodes: LayerNode[]): LayerNode[] {
  const kids = new Map<string, LayerNode[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const siblings = kids.get(node.parentId);
    if (siblings) siblings.push(node);
    else kids.set(node.parentId, [node]);
  }

  const sameBox = (a: LayerNode, b: LayerNode) =>
    Math.abs(a.bounds.x - b.bounds.x) < 0.5 &&
    Math.abs(a.bounds.y - b.bounds.y) < 0.5 &&
    Math.abs(a.bounds.width - b.bounds.width) < 0.5 &&
    Math.abs(a.bounds.height - b.bounds.height) < 0.5;

  /** Down through wrappers that add a layer and no box of their own. */
  const resolve = (node: LayerNode): LayerNode => {
    let current = node;
    for (;;) {
      const children = kids.get(current.id) ?? [];
      const only = children.length === 1 ? children[0] : undefined;
      if (!only || (kids.get(only.id)?.length ?? 0) === 0 || !sameBox(current, only)) return current;
      current = only;
    }
  };

  /**
   * What a container really holds, once its wrappers are seen through.
   *
   * A wrapper is not itself a container: if resolving it lands somewhere else, it has no
   * box of its own to hold anything in. Skipping those is what keeps a row's container the
   * list rather than the frame around it — otherwise the row is the only child of its own
   * wrapper, nothing repeats, and every wrapped row goes unselectable.
   */
  const held = new Map<string, LayerNode[]>();
  for (const [parentId, children] of kids) {
    const parent = nodes.find((n) => n.id === parentId);
    if (parent && resolve(parent).id !== parentId) continue;
    held.set(parentId, children.map(resolve));
  }

  /** Where a resolved node sits, which is the container it was resolved out of. */
  const container = new Map<string, string>();
  for (const [parentId, children] of held) {
    for (const child of children) container.set(child.id, parentId);
  }

  const repeats = (node: LayerNode | undefined): boolean => {
    if (!node) return false;
    const parentId = container.get(node.id);
    if (!parentId) return false;
    return (held.get(parentId) ?? []).filter((s) => s.name === node.name).length > 1;
  };

  const marked = new Set(
    nodes
      .map(resolve)
      .filter(
        (node) =>
          (kids.get(node.id)?.length ?? 0) > 0 &&
          (repeats(node) || node.depth <= 2) &&
          !repeats(nodes.find((n) => n.id === container.get(node.id)))
      )
      .map((node) => node.id)
  );

  return nodes.map((node) => ({ ...node, isSection: marked.has(node.id) }));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
