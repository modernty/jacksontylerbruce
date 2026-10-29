import { readFileSync } from "node:fs";
import { projectCard, resolveView } from "../ask/src/registry.js";
import { buildTimeline } from "../ask/src/timeline.js";

const map = JSON.parse(readFileSync(new URL("../public/map.json", import.meta.url), "utf8"));
const catalog = { nodes: map.nodes };
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const rejected = resolveView(
  { type: "show_project", id: "project:missing", summary: "INJECTED COPY", title: "Nope" },
  catalog,
);
check(rejected.type === "text" && rejected.reason === "unknown-id", "unknown id was not rejected");
check(!JSON.stringify(rejected).includes("INJECTED"), "unknown id leaked injected copy");

const secret = projectCard("project:secret", {
  nodes: [
    {
      id: "project:secret",
      type: "project",
      slug: "secret",
      label: "Secret",
      summary: "hidden dossier",
      role: "Quiet",
      year: "1999",
      visible: false,
      confidential: true,
    },
  ],
});
check(secret.type === "text", "confidential id was not rejected");
check(!JSON.stringify(secret).includes("hidden dossier"), "confidential summary leaked");
check(!JSON.stringify(secret).includes("Quiet"), "confidential role leaked");

const node = catalog.nodes.find((item) => item.id === "project:lazarus-brand");
const card = projectCard("project:lazarus-brand", catalog);
check(card.type === "show_project", "public project did not resolve");
check(card.title === node.label, "title did not come from the catalog");
check(card.summary === (node.summary || ""), "summary did not come from the catalog");
check(card.role === (node.role || ""), "role did not come from the catalog");
check(card.years === (node.year || ""), "years did not come from the catalog");
check(!JSON.stringify(card).includes("NEEDS TYLER"), "placeholder leaked into the card");
check(card.links.some((link) => link.kind === "section" && link.href.includes("#")), "section link missing");
check(card.links.some((link) => link.kind === "project" && link.href.includes("/work/")), "related link missing");
check(!card.preview || /^https?:\/\//.test(card.preview), "preview was not a public http url");

const injected = resolveView(
  { type: "show_project", id: "project:lazarus-brand", summary: "INJECTED COPY" },
  catalog,
);
check(injected.type === "show_project" && injected.id === "project:lazarus-brand", "valid id dropped");
check(!("summary" in injected), "resolver kept model copy");

const anchored = resolveView(
  { type: "show_project", id: "project:lazarus-brand", anchor: "summary" },
  catalog,
);
check(anchored.anchor === "summary", "known anchor was dropped");
const unknownAnchor = resolveView(
  { type: "show_project", id: "project:lazarus-brand", anchor: "nope" },
  catalog,
);
check(unknownAnchor.type === "show_project" && unknownAnchor.anchor === undefined, "unknown anchor was kept");

const timeline = resolveView(
  { type: "show_timeline", anchor: "summary", focus: "TwelveLabs" },
  catalog,
);
check(timeline.type === "show_timeline", "timeline view was not registered");
check(timeline.anchor === "summary", "timeline anchor was not preserved");
check(timeline.focus === undefined, "unknown timeline focus was kept");
check(!JSON.stringify(timeline).toLowerCase().includes("twelvelabs"), "focus text leaked");

const timed = buildTimeline({ nodes: map.nodes, edges: map.edges });
const flat = JSON.stringify(timed).toLowerCase();
check(!flat.includes("twelvelabs"), "timeline names TwelveLabs");
check(!flat.includes("latecheckout") && !flat.includes("late checkout"), "timeline names LateCheckout");
check(!flat.includes("graduat"), "timeline mentions graduation");
check(!flat.includes("virginia tech"), "timeline mentions Virginia Tech");
check(!/\bvt\b/.test(flat), "timeline mentions VT");
check(timed.lanes.find((lane) => lane.id === "posts").items.length === 0, "posts lane is not quiet");
const now = timed.lanes.flatMap((lane) => lane.items).filter((item) => item.now);
check(now.length === 1 && now[0].id === "project:overmatch-ai", "now is not Overmatch");
check(now[0].open === true, "now line is closed");
check(now[0].label === "Overmatch AI" && now[0].meta === "Design Lead", "now label drifted");
check(
  timed.lanes.find((lane) => lane.id === "labs").items.some((item) => item.id === "project:verystrongopinion"),
  "labs lane missed own work",
);
const corelogic = timed.lanes.flatMap((lane) => lane.items).find((item) => item.id === "project:corelogic");
check(corelogic && corelogic.related.includes("project:nestle"), "related arc ids missing");

const poisoned = buildTimeline({
  nodes: [
    {
      id: "project:secret-lab",
      type: "project",
      slug: "secret-lab",
      label: "TwelveLabs",
      name: "TwelveLabs",
      role: "Design Lead",
      year: "2024",
      visible: true,
      confidential: false,
      clientIds: ["client:own"],
    },
    {
      id: "client:own",
      type: "client",
      slug: "own",
      label: "LateCheckout",
      summary: "Own",
      visible: true,
      confidential: false,
    },
    {
      id: "project:school",
      type: "project",
      slug: "school",
      label: "Virginia Tech",
      role: "Student",
      year: "2012",
      visible: true,
      confidential: false,
      clientIds: [],
    },
    {
      id: "project:blank",
      type: "project",
      slug: "blank",
      label: "Unnamed",
      role: "Made",
      year: "2020",
      visible: true,
      confidential: false,
      clientIds: ["client:own"],
    },
  ],
  edges: [],
});
const poisonedText = JSON.stringify(poisoned).toLowerCase();
check(!poisonedText.includes("twelvelabs"), "injected TwelveLabs survived");
check(!poisonedText.includes("latecheckout"), "injected LateCheckout survived");
check(!poisonedText.includes("virginia tech"), "injected school survived");
check(!poisonedText.includes("unnamed"), "unnamed row survived");
check(poisoned.lanes.every((lane) => lane.items.length === 0), "unsafe rows were placed");

const scripted = projectCard("project:evil", {
  nodes: [
    {
      id: "project:evil",
      type: "project",
      slug: "evil",
      label: "Evil",
      summary: "Public line.",
      visible: true,
      confidential: false,
      demo: "javascript:alert(1)",
      sections: [{ id: "summary", title: "Summary", body: "Public line." }],
    },
  ],
});
check(scripted.type === "show_project" && scripted.preview === "", "non-http preview was kept");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
