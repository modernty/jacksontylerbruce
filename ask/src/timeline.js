/**
 * Career timeline from public catalog rows only.
 * Ids in, public labels out. Unsafe or unnamed rows are dropped.
 */

import { projectsOf, workHref } from "./registry.js";

const MONTH = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const RANK = { manual: 0, client: 1, semantic: 2, idea: 3, discipline: 4, tool: 5 };

// October 2026, plus a short margin so the open end has room.
const NOW = 2026 + 9 / 12;
const AXIS_END = NOW + 2 / 12;

function clean(value) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text || text.includes("NEEDS TYLER")) return "";
  if (/^unnamed$/i.test(text)) return "";
  return text;
}

function monthIndex(token) {
  if (!token) return null;
  const key = token.slice(0, 3).toLowerCase();
  return Object.prototype.hasOwnProperty.call(MONTH, key) ? MONTH[key] : null;
}

function parsePoint(value, end) {
  const month = /^(\d{4})-(\d{2})$/.exec(value);
  if (month) {
    const year = Number(month[1]);
    const number = Number(month[2]);
    if (number < 1 || number > 12) return null;
    return year + (end ? number : number - 1) / 12;
  }
  const year = /^(\d{4})$/.exec(value);
  if (year) return Number(year[1]) + (end ? 1 : 0);
  return null;
}

export function parseWhen(project) {
  const year = clean(project.year);
  const startRaw = clean(project.start);
  const endRaw = clean(project.end);
  if (!year && !startRaw) return null;

  let start = startRaw ? parsePoint(startRaw, false) : null;
  let end = endRaw ? parsePoint(endRaw, true) : null;
  let open = false;

  if (year) {
    const present = /^(?:([A-Za-z]+)\s+)?(\d{4})\s*[–—-]\s*present$/i.exec(year);
    const monthRange = /^(\d{4})\s*[–—-]\s*([A-Za-z]+)\s+(\d{4})$/.exec(year);
    const yearRange = /^(\d{4})\s*[–—-]\s*(\d{4})$/.exec(year);
    const one = /^(\d{4})$/.exec(year);
    if (present) {
      open = true;
      if (start == null) start = Number(present[2]) + (monthIndex(present[1]) || 0) / 12;
    } else if (monthRange) {
      if (start == null) start = Number(monthRange[1]);
      if (end == null) {
        const month = monthIndex(monthRange[2]);
        end = Number(monthRange[3]) + (month == null ? 1 : (month + 1) / 12);
      }
    } else if (yearRange) {
      if (start == null) start = Number(yearRange[1]);
      if (end == null) end = Number(yearRange[2]) + 1;
    } else if (one) {
      if (start == null) start = Number(one[1]);
      if (end == null) end = Number(one[1]) + 1;
    }
  }

  if (start == null || Number.isNaN(start)) return null;
  if (!open && (end == null || end <= start)) end = start + 1;
  return { start, end: open ? null : end, open, label: year };
}

function clientsOf(catalog) {
  const rows = (catalog && (catalog.nodes || catalog.clients)) || [];
  return rows.filter((node) => node && node.type === "client" && node.visible !== false && node.confidential !== true);
}

function isEmployer(client) {
  const kind = client.clientType || client.summary || "";
  return /^employer\b/i.test(kind);
}

function isOwn(client) {
  const kind = client.clientType || client.summary || "";
  return client.id === "client:own" || /^own\b/i.test(kind);
}

function sectionId(project) {
  const section = (project.sections || []).find((item) => item && item.id);
  return section ? section.id : undefined;
}

function aliasesOf(project) {
  return (project.aliases || []).map((item) => clean(item)).filter(Boolean);
}

function roleName(project, host) {
  if (aliasesOf(project).includes("PC Health")) return "Loblaw / PC Health";
  return clean((host && (host.label || host.name)) || "");
}


export function buildTimeline(catalog, options = {}) {
  const projects = projectsOf(catalog);
  const clients = clientsOf(catalog);
  const byClient = new Map(clients.map((client) => [client.id, client]));
  const edges = (catalog && catalog.edges) || [];
  const items = [];

  for (const project of projects) {
    const when = parseWhen(project);
    if (!when) continue;
    const linked = (project.clientIds || []).map((id) => byClient.get(id)).filter(Boolean);
    const own = linked.some(isOwn);
    const employers = linked.filter(isEmployer);
    const label = aliasesOf(project).includes("PC Health")
      ? "Loblaw / PC Health"
      : clean(project.label || project.name || "");
    const role = clean(project.role);
    const year = when.label;
    if (!label) continue;
    const href = workHref(project.slug, sectionId(project));
    const lane = own ? "labs" : "projects";
    items.push({
      markId: `${lane}:${project.id}`,
      id: project.id,
      lane,
      label,
      meta: role,
      year,
      href,
      when,
    });
    if (own || !role) continue;
    let hosts = employers;
    if (when.open && hosts.length === 0) hosts = linked.filter((client) => !isOwn(client));
    for (const host of hosts) {
      const hostLabel = roleName(project, host);
      if (!hostLabel) continue;
      items.push({
        markId: `roles:${project.id}:${host.id}`,
        id: project.id,
        lane: "roles",
        label: hostLabel,
        meta: role,
        year,
        href,
        when,
        now: Boolean(when.open),
      });
    }
  }

  const present = new Set(items.map((item) => item.id));
  for (const item of items) {
    const related = [];
    for (const edge of edges) {
      if (!edge) continue;
      const other = edge.from === item.id ? edge.to : edge.to === item.id ? edge.from : "";
      if (!other || other === item.id || !present.has(other)) continue;
      related.push({ id: other, kind: edge.kind || "" });
    }
    related.sort((left, right) => (RANK[left.kind] ?? 9) - (RANK[right.kind] ?? 9) || left.id.localeCompare(right.id));
    const seen = new Set();
    item.related = [];
    for (const rel of related) {
      if (seen.has(rel.id)) continue;
      seen.add(rel.id);
      item.related.push(rel.id);
      if (item.related.length === 5) break;
    }
  }

  let min = Infinity;
  for (const item of items) min = Math.min(min, item.when.start);
  if (!Number.isFinite(min)) min = 2020;
  min = Math.floor(min);
  const end = Math.max(AXIS_END, min + 1 / 12);
  const span = end - min;
  const clamp = (value) => Math.min(1, Math.max(0, value));

  for (const item of items) {
    item.x0 = clamp((item.when.start - min) / span);
    item.x1 = item.when.open ? 1 : clamp((item.when.end - min) / span);
    if (item.x1 < item.x0) item.x1 = item.x0;
    item.point = item.lane === "roles" ? item.x0 : (item.x0 + item.x1) / 2;
    item.open = Boolean(item.when.open);
    item.now = Boolean(item.now);
    delete item.when;
  }

  const order = ["roles", "projects", "labs", "posts"];
  const names = { roles: "Roles", projects: "Projects", labs: "Labs", posts: "Posts" };
  const lanes = order.map((id) => ({
    id,
    label: names[id],
    items: items
      .filter((item) => item.lane === id)
      .sort((left, right) => left.x0 - right.x0 || left.id.localeCompare(right.id)),
  }));
  const ticks = [];
  for (let year = min; year <= end; year += 1) ticks.push(year);
  const requested = options && typeof options.focus === "string" ? options.focus : "";
  const focus = requested && present.has(requested) ? requested : undefined;
  return { lanes, ticks, start: min, end, focus };
}
