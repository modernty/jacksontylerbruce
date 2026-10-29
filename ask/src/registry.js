/**
 * View calls are a discriminated union. Props carry ids (and an optional
 * anchor). Components resolve copy from the public catalog, never from the
 * model payload. Unknown or non-public ids fall back to text.
 *
 * Voice, cited highlights, and section retrieval are later. The anchor field
 * stays on every call so those can land without a new union.
 */

export const VIEW_TYPES = [
  "show_project",
  "show_timeline",
  "explain_pattern",
  "show_related",
  "text",
];

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNIMPLEMENTED = new Set(["explain_pattern", "show_related"]);

function callType(call) {
  if (!call || typeof call !== "object") return "";
  return call.type || call.tool || call.toolName || "";
}

function optionalAnchor(value) {
  return typeof value === "string" && KEBAB.test(value) ? value : undefined;
}

export function projectsOf(catalog) {
  const rows = (catalog && (catalog.nodes || catalog.projects)) || [];
  return rows.filter(isPublicProject);
}

export function isPublicProject(node) {
  if (!node || node.type !== "project") return false;
  if (node.visible === false || node.confidential === true) return false;
  if (!node.id) return false;
  return true;
}

export function findPublicProject(catalog, id) {
  if (typeof id !== "string" || !id) return null;
  return projectsOf(catalog).find((node) => node.id === id) || null;
}

function publicHttp(value) {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function workHref(slug, sectionId) {
  const path = `/work/${slug}/`;
  return sectionId ? `${path}#${sectionId}` : path;
}

export function relatedLinks(project, catalog) {
  const projects = projectsOf(catalog);
  const links = [];
  for (const section of project.sections || []) {
    if (!section || !section.id || !section.title) continue;
    links.push({
      href: workHref(project.slug, section.id),
      label: section.title,
      kind: "section",
      sectionId: section.id,
    });
  }
  const mine = new Set([
    ...(project.clientIds || []),
    ...(project.ideaIds || []),
    ...(project.patternIdeaIds || []),
  ]);
  const related = projects
    .filter((other) => other.id !== project.id)
    .filter((other) => {
      const theirs = [
        ...(other.clientIds || []),
        ...(other.ideaIds || []),
        ...(other.patternIdeaIds || []),
      ];
      return theirs.some((item) => mine.has(item));
    })
    .sort((left, right) => left.id.localeCompare(right.id))
    .slice(0, 4);
  for (const other of related) {
    const section = (other.sections || []).find((item) => item && item.id);
    links.push({
      href: workHref(other.slug, section ? section.id : undefined),
      label: other.label || other.name || other.slug,
      kind: "project",
      sectionId: section ? section.id : undefined,
    });
  }
  if (links.length === 0) {
    links.push({ href: "/", label: "Ask Tyler", kind: "home" });
  }
  return links;
}

export function resolveView(call, catalog) {
  const type = callType(call);
  const anchor = optionalAnchor(call && call.anchor);
  if (type === "text") {
    return {
      type: "text",
      text: call && typeof call.text === "string" ? call.text : "",
      anchor,
    };
  }
  if (!VIEW_TYPES.includes(type)) {
    return { type: "text", text: "That view is not available.", reason: "unknown-tool" };
  }
  if (type === "show_timeline") {
    const requested = call && typeof call.focus === "string" ? call.focus : "";
    const focused = requested ? findPublicProject(catalog, requested) : null;
    return {
      type: "show_timeline",
      focus: focused ? focused.id : undefined,
      anchor,
    };
  }
  if (UNIMPLEMENTED.has(type)) {
    return {
      type: "text",
      text: "That view is not in this slice.",
      reason: "unimplemented",
      anchor,
    };
  }
  const project = findPublicProject(catalog, call.id);
  if (!project) {
    return {
      type: "text",
      text: "That project is not in the public record.",
      reason: "unknown-id",
    };
  }
  const known = anchor && (project.sections || []).some((section) => section.id === anchor);
  return { type: "show_project", id: project.id, anchor: known ? anchor : undefined };
}

export function projectCard(id, catalog, anchor) {
  const resolved = resolveView({ type: "show_project", id, anchor }, catalog);
  if (resolved.type !== "show_project") {
    return { type: "text", text: resolved.text, reason: resolved.reason };
  }
  const project = findPublicProject(catalog, resolved.id);
  const preview =
    publicHttp(project.demo) || publicHttp(project.preview) || publicHttp(project.url) || "";
  return {
    type: "show_project",
    id: project.id,
    anchor: resolved.anchor,
    title: project.label || project.name || "",
    role: project.role || "",
    years: project.year || "",
    summary: project.summary || "",
    preview,
    links: relatedLinks(project, catalog).map((link) => ({
      ...link,
      current: Boolean(resolved.anchor && link.sectionId === resolved.anchor && link.kind === "section"),
    })),
  };
}
