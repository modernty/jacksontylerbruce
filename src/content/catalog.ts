import "server-only"
import placesFile from "@/content/places.json"
import { mediaFor } from "./media"
import { generateSections } from "./sections"
import { CatalogSchema, type Catalog, type Client, type Place, type Project, type Role, type Theme } from "./schema"

const en = "\u2013"

function section(id: string, title: string, body: string) {
  return { id, title, body, items: [] }
}

const themes: Theme[] = [
  { id: "theme:ai", key: "AI", slug: "ai", label: "AI", name: "AI" },
  { id: "theme:trust", key: "Trust", slug: "trust", label: "TRUST IN AI", name: "Trust in AI" },
  { id: "theme:systems", key: "Systems", slug: "systems", label: "SYSTEMS", name: "Systems" },
  { id: "theme:arch", key: "Arch", slug: "architecture", label: "ARCHITECTURE", name: "Architecture" },
  { id: "theme:spatial", key: "Spatial", slug: "spatial", label: "SPATIAL", name: "Spatial" },
  { id: "theme:material", key: "Material", slug: "material", label: "MATERIAL", name: "Material" },
  { id: "theme:identity", key: "Identity", slug: "identity", label: "IDENTITY", name: "Identity" },
  { id: "theme:finance", key: "Finance", slug: "finance", label: "FINANCE", name: "Finance" },
]

function role(
  id: string,
  name: string,
  title: Role["title"],
  start: number,
  end: number | null,
  yearLabel: string,
  lane: number,
  clientIds: string[],
  aliases: string[],
  extra: Partial<Role> = {},
): Role {
  return {
    id,
    name,
    employer: false,
    listed: true,
    title,
    start,
    end,
    yearLabel,
    lane,
    clientIds,
    aliases,
    ...extra,
  }
}

const projects: Omit<Project, "media">[] = [
  {
    id: "project:usm-hue-man",
    slug: "usm-hue-man",
    name: "USM Hue + Man",
    summary: "A travelling installation and competition identity for USM, shown at Design Miami.",
    sections: [section("summary", "Summary", "A travelling installation and competition identity for USM, shown at Design Miami.")],
    start: 2020.0,
    end: 2020.5,
    roleId: "role:joba",
    clientId: "client:joba",
    lane: 0,
    themeIds: ["theme:spatial", "theme:material", "theme:identity"],
    onTimeline: true,
    flagged: false,
    aliases: ["hue man", "hueman", "hue+man", "design miami"],
  },
  {
    id: "project:corelogic",
    slug: "corelogic",
    name: "CoreLogic",
    summary: "Cora, a digital person, presented on a video wall and a touch table.",
    sections: [section("summary", "Summary", "Cora, a digital person, presented on a video wall and a touch table in a discovery center.")],
    start: 2021.65,
    end: 2022.1,
    roleId: "role:soul-machines",
    clientId: "client:soul-machines",
    lane: 1,
    themeIds: ["theme:ai", "theme:spatial"],
    onTimeline: true,
    flagged: false,
    aliases: ["cora", "corelogic"],
  },
  {
    id: "project:nestle",
    slug: "nestle",
    name: "Nestl\u00e9",
    summary: "Ruth, a conversational coach for baking.",
    sections: [section("summary", "Summary", "Ruth, a conversational coach for baking, built with Soul Machines.")],
    start: 2022.1,
    end: 2022.5,
    roleId: "role:soul-machines",
    clientId: "client:soul-machines",
    lane: 1,
    themeIds: ["theme:ai"],
    onTimeline: true,
    flagged: false,
    aliases: ["nestle", "ruth"],
  },
  {
    id: "project:fintech-terminal",
    slug: "fintech-terminal",
    name: "FinTech Terminal",
    summary: "A retail-investor terminal for news, education and market data.",
    sections: [section("summary", "Summary", "A retail-investor terminal for news, education and market data.")],
    start: 2022.15,
    end: 2022.7,
    roleId: "role:urvin",
    clientId: "client:urvin",
    lane: 2,
    themeIds: ["theme:finance", "theme:systems"],
    onTimeline: true,
    flagged: true,
    aliases: ["fintech terminal", "fintech"],
  },
  {
    id: "project:fixed-rate-fixed-term",
    slug: "fixed-rate-fixed-term",
    name: "Fixed Rate Fixed Term",
    summary: "Fixed-rate, fixed-term lending on Solana, designed so a new kind of market feels trustworthy.",
    sections: [section("summary", "Summary", "Fixed-rate, fixed-term lending on Solana, designed so a new kind of market feels trustworthy.")],
    start: 2022.8,
    end: 2023.6,
    roleId: "role:jet",
    clientId: "client:jet",
    lane: 0,
    themeIds: ["theme:finance", "theme:trust"],
    onTimeline: true,
    flagged: false,
    aliases: ["fixed rate fixed term", "fixed rate", "fixed term"],
  },
  {
    id: "project:jet-brand",
    slug: "jet-brand",
    name: "Jet brand",
    summary: "A tighter brand for Jet Protocol.",
    sections: [section("summary", "Summary", "A tighter brand for Jet Protocol.")],
    start: 2023.0,
    end: 2023.4,
    roleId: "role:jet",
    clientId: "client:jet",
    lane: 0,
    themeIds: ["theme:identity"],
    onTimeline: false,
    flagged: false,
    aliases: ["jet brand"],
  },
  {
    id: "project:novart",
    slug: "novart",
    name: "Novart",
    summary: "Art-as-collateral lending, rebuilt as two gates, a short form and a dashboard.",
    sections: [
      section("summary", "Summary", "Art-as-collateral lending, rebuilt as two gates, a short form and a dashboard."),
      section("flow", "Flow", "Location and collateral come first. What remains is a short form and a dashboard for offers and messages."),
    ],
    start: 2023.15,
    end: 2023.6,
    roleId: "role:nax",
    clientId: "client:nax",
    lane: 1,
    themeIds: ["theme:finance", "theme:arch"],
    onTimeline: true,
    flagged: false,
    aliases: ["novart"],
  },
  {
    id: "project:chatter-app",
    slug: "chatter-app",
    name: "Chatter app",
    summary: "A group, live and stream product with creator monetization.",
    sections: [section("summary", "Summary", "A group, live and stream product with creator monetization.")],
    start: 2023.8,
    end: 2025.0,
    roleId: "role:chatter",
    clientId: "client:chatter",
    lane: 2,
    themeIds: ["theme:systems"],
    onTimeline: true,
    flagged: true,
    aliases: ["chatter app"],
  },
  {
    id: "project:chatter-brand",
    slug: "chatter-brand",
    name: "Chatter brand",
    summary: "The Chatter Social brand, from first concept through launch.",
    sections: [section("summary", "Summary", "The Chatter Social brand, from first concept through launch.")],
    start: 2023.8,
    end: 2024.3,
    roleId: "role:chatter",
    clientId: "client:chatter",
    lane: 2,
    themeIds: ["theme:identity"],
    onTimeline: false,
    flagged: false,
    aliases: ["chatter brand"],
  },
  {
    id: "project:lazarus-brand",
    slug: "lazarus-brand",
    name: "Lazarus brand",
    summary: "Verbal and visual identity, wireframe textures, and an atomic component library.",
    sections: [section("summary", "Summary", "Verbal and visual identity, wireframe textures, and an atomic component library.")],
    start: 2024.2,
    end: 2024.8,
    roleId: "role:lazarus",
    clientId: "client:lazarus",
    lane: 0,
    themeIds: ["theme:identity", "theme:material", "theme:systems"],
    onTimeline: true,
    flagged: false,
    aliases: ["lazarus brand"],
  },
  {
    id: "project:model-playground",
    slug: "model-playground",
    name: "Model Playground",
    summary: "A shared system for prompting foundation models and making the results legible.",
    sections: [
      section("summary", "Summary", "A shared system for prompting foundation models and making the results legible."),
      section("system", "System", "One design system carries demos, sales conversations and on-prem installs."),
    ],
    start: 2024.5,
    end: 2025.6,
    roleId: "role:lazarus",
    clientId: "client:lazarus",
    lane: 0,
    themeIds: ["theme:ai", "theme:trust", "theme:arch", "theme:systems"],
    onTimeline: true,
    flagged: false,
    aliases: ["model playground", "playground"],
  },
  {
    id: "project:usm-milan",
    slug: "usm-milan",
    name: "USM: Milan",
    summary: "An immersive Haller Soft Panel installation for Milan Design Week, with Joba Studio.",
    sections: [section("summary", "Summary", "An immersive Haller Soft Panel installation for Milan Design Week, with Joba Studio.")],
    start: 2024.9,
    end: 2025.35,
    roleId: "role:joba",
    clientId: "client:joba",
    lane: 1,
    themeIds: ["theme:spatial", "theme:material", "theme:identity"],
    onTimeline: true,
    flagged: false,
    orgLabel: "Joba \u00d7 USM",
    aliases: ["usm milan", "milan"],
  },
  {
    id: "project:atls",
    slug: "atls",
    name: "ATLS",
    summary: "Agentic matching that shows a rationale at every level, with constraint toggles.",
    sections: [section("summary", "Summary", "Agentic matching that shows a rationale at every level, with constraint toggles.")],
    start: 2025.4,
    end: 2026.4,
    roleId: "role:lazarus",
    clientId: "client:lazarus",
    lane: 0,
    themeIds: ["theme:ai", "theme:trust"],
    onTimeline: true,
    flagged: false,
    aliases: ["atls", "talent management"],
  },
  {
    id: "project:loblaw",
    slug: "loblaw",
    name: "Loblaw / PC Health",
    summary: "Public work for this client during the current role.",
    sections: [section("summary", "Summary", "Public work for this client during the current role.")],
    start: 2026.04,
    end: null,
    roleId: "role:employer",
    clientId: "client:loblaw-pc-health",
    lane: 1,
    themeIds: ["theme:systems"],
    onTimeline: true,
    flagged: false,
    aliases: ["loblaw", "pc health"],
  },
  {
    id: "project:remedy",
    slug: "remedy",
    name: "Remedy",
    summary: "A health chat with consent, citations, and a handoff when a person should take over.",
    sections: [section("summary", "Summary", "A health chat with consent, citations, and a handoff when a person should take over.")],
    start: 2026.1,
    end: 2026.6,
    roleId: "role:employer",
    clientId: "client:loblaw-pc-health",
    lane: 1,
    themeIds: ["theme:ai", "theme:trust", "theme:systems"],
    onTimeline: true,
    flagged: true,
    aliases: ["remedy"],
  },
  {
    id: "project:intuit",
    slug: "intuit",
    name: "Intuit",
    summary: "Exploring a ChatGPT integration that lets clients invoice and track balances, connected to Intuit Wallet.",
    sections: [section("summary", "Summary", "Exploring a ChatGPT integration that lets clients invoice and track balances, connected to Intuit Wallet.")],
    start: 2026.45,
    end: null,
    roleId: "role:employer",
    clientId: "client:intuit",
    lane: 1,
    themeIds: ["theme:finance"],
    onTimeline: true,
    flagged: false,
    aliases: ["intuit"],
  },
  {
    id: "project:overmatch-patterns",
    slug: "overmatch-patterns",
    name: "Overmatch patterns",
    summary: "Sample work in progress: product patterns for AI tools, as Design Lead.",
    sections: [
      section("summary", "Summary", "Sample work in progress: product patterns for AI tools, as Design Lead."),
      section("patterns", "Patterns", "Dynamic objective-specific plans, plus trust and verifiable reasoning."),
    ],
    start: 2026.4,
    end: null,
    roleId: "role:overmatch",
    clientId: "client:overmatch",
    lane: 2,
    themeIds: ["theme:ai", "theme:trust", "theme:systems"],
    onTimeline: false,
    flagged: false,
    aliases: ["overmatch patterns", "overmatch"],
  },
  {
    id: "project:traveller",
    slug: "traveller",
    name: "Traveller",
    summary: "A personal trip-planning platform.",
    sections: [section("summary", "Summary", "A personal trip-planning platform.")],
    start: 2026.5,
    end: null,
    roleId: "role:own",
    clientId: "client:own",
    lane: 2,
    themeIds: ["theme:arch", "theme:systems"],
    onTimeline: true,
    flagged: true,
    orgLabel: "Side project",
    aliases: ["traveller"],
  },
]

function client(id: string, name: string, roleId: string, projectIds: string[], extra: Partial<Client> = {}): Client {
  return { id, name, usesEmployerName: false, roleId, projectIds, ...extra }
}

const clients: Client[] = [
  client("client:joba", "Joba Studio", "role:joba", ["project:usm-hue-man", "project:usm-milan"]),
  client("client:soul-machines", "Soul Machines", "role:soul-machines", ["project:corelogic", "project:nestle"]),
  client("client:urvin", "Urvin Finance", "role:urvin", ["project:fintech-terminal"]),
  client("client:jet", "Jet Protocol", "role:jet", ["project:fixed-rate-fixed-term", "project:jet-brand"]),
  client("client:nax", "Nax Group", "role:nax", ["project:novart"]),
  client("client:chatter", "Chatter Social", "role:chatter", ["project:chatter-app", "project:chatter-brand"]),
  client("client:lazarus", "Lazarus AI", "role:lazarus", ["project:lazarus-brand", "project:model-playground", "project:atls"]),
  client("client:loblaw-pc-health", "Loblaw / PC Health", "role:employer", ["project:loblaw", "project:remedy"]),
  client("client:intuit", "Intuit", "role:employer", ["project:intuit"]),
  client("client:overmatch", "Overmatch AI", "role:overmatch", ["project:overmatch-patterns"]),
  client("client:own", "Side project", "role:own", ["project:traveller"]),
]

const roles: Role[] = [
  role("role:joba", "Joba Studio", "Designer", 2019.35, 2021.55, `2019${en}21`, 0, ["client:joba"], ["joba", "joba studio"]),
  role("role:soul-machines", "Soul Machines", "Designer", 2021.6, 2022.55, `2021${en}22`, 1, ["client:soul-machines"], ["soul machines", "soul"]),
  role("role:urvin", "Urvin Finance", "Designer", 2022.1, 2022.7, "2022", 2, ["client:urvin"], ["urvin"]),
  role("role:jet", "Jet Protocol", "Designer", 2022.78, 2023.8, `2022${en}23`, 0, ["client:jet"], ["jet protocol"]),
  role("role:nax", "Nax Group", "Designer", 2023.1, 2023.65, "2023", 1, ["client:nax"], ["nax", "nax group"]),
  role("role:chatter", "Chatter Social", "Design Director", 2023.78, 2025.7, `2023${en}25`, 2, ["client:chatter"], ["chatter social", "chatter"]),
  role("role:lazarus", "Lazarus AI", "Design Lead", 2024.13, 2026.56, `2024${en}26`, 0, ["client:lazarus"], ["lazarus", "lazarus ai"]),
  role("role:employer", "", "Senior Designer", 2026.04, null, `2026${en}`, 1, ["client:loblaw-pc-health", "client:intuit"], ["current role", "current employer"], {
    employer: true,
    since: "Jan 2026",
  }),
  role("role:overmatch", "Overmatch AI", "Design Lead", 2026.35, null, `2026${en}`, 2, ["client:overmatch"], ["overmatch ai"], {
    since: "May 2026",
  }),
  role("role:own", "Side project", "Designer", 2026.5, null, `2026${en}`, 2, ["client:own"], ["side project"], {
    listed: false,
  }),
]

type AuthoredPlace = { slug: string; name: string; country: string; lat: number; lng: number; kind: Place["kind"] }

/** Home comes first, so the profile and the location answer always resolve to it. */
const places: Place[] = (() => {
  const all = (placesFile.places as AuthoredPlace[]).map(({ slug, ...place }) => ({ id: `place:${slug}`, ...place }))
  const home = all.find((place) => place.id === `place:${placesFile.home}`)
  if (!home) throw new Error("content/places.json: home is not in the list")
  return [home, ...all.filter((place) => place !== home)]
})()

function relations(): Catalog["relations"] {
  const rows: Catalog["relations"] = [
    { id: "rel:profile-miami", from: "profile:tyler", to: "place:miami", kind: "located" },
  ]
  for (const item of clients) {
    rows.push({ id: `rel:${item.roleId}:${item.id}`, from: item.roleId, to: item.id, kind: "includes" })
    for (const projectId of item.projectIds) {
      rows.push({ id: `rel:${item.id}:${projectId}`, from: item.id, to: projectId, kind: "includes" })
      rows.push({ id: `rel:${projectId}:${item.id}`, from: projectId, to: item.id, kind: "for" })
      rows.push({ id: `rel:${projectId}:${item.roleId}`, from: projectId, to: item.roleId, kind: "during" })
    }
  }
  for (const project of projects) {
    for (const themeId of project.themeIds) {
      rows.push({ id: `rel:${project.id}:${themeId}`, from: project.id, to: themeId, kind: "tagged" })
    }
  }
  return rows
}

export function loadCatalog(): Catalog {
  const publicNames = new Map(projects.filter((project) => !project.flagged).map((project) => [project.slug, project.name]))
  return CatalogSchema.parse({
    profile: {
      id: "profile:tyler",
      name: "Tyler Jackson",
      title: "Designer",
      location: "Miami, FL",
      placeId: "place:miami",
    },
    places,
    themes,
    roles,
    clients,
    projects: projects.map((project) => ({
      ...project,
      sections: generateSections(project.slug, project.sections, publicNames),
      media: mediaFor(project.slug, project.name),
    })),
    relations: relations(),
  })
}
