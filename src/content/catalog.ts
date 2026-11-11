import "server-only"
import placesFile from "@/content/places.json"
import notionProjects from "@/content/notion-projects.json"
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
    id: "project:the-terminal",
    slug: "the-terminal",
    name: "The Terminal",
    summary: "A retail-investor terminal for news, education and market data.",
    sections: [section("summary", "Summary", "A retail-investor terminal for news, education and market data.")],
    start: 2022.15,
    end: 2022.7,
    roleId: "role:urvin",
    clientId: "client:urvin",
    lane: 2,
    themeIds: ["theme:finance", "theme:systems"],
    onTimeline: true,
    flagged: false,
    aliases: ["the terminal", "terminal", "fintech terminal", "fintech"],
  },
  {
    id: "project:fixed-rate-fixed-term",
    slug: "fixed-rate-fixed-term",
    name: "Fixed Rate Fixed Term",
    summary: "Fixed-rate, fixed-term lending on Solana, designed so a new kind of market feels trustworthy.",
    sections: [
      section("summary", "Summary", "Fixed-rate, fixed-term lending on Solana, designed so a new kind of market feels trustworthy."),
      section("brand", "Brand", "A tighter brand for Jet Protocol."),
    ],
    start: 2022.8,
    end: 2023.6,
    roleId: "role:jet",
    clientId: "client:jet",
    lane: 0,
    themeIds: ["theme:finance", "theme:trust", "theme:identity"],
    onTimeline: true,
    flagged: false,
    aliases: ["fixed rate fixed term", "fixed rate", "fixed term", "jet brand"],
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
    id: "project:chatter",
    slug: "chatter",
    name: "Chatter",
    summary: "A group, live and stream product with creator monetization.",
    sections: [
      section("summary", "Summary", "A group, live and stream product with creator monetization."),
      section("brand", "Brand", "The Chatter Social brand, from first concept through launch."),
    ],
    start: 2023.8,
    end: 2025.0,
    roleId: "role:chatter",
    clientId: "client:chatter",
    lane: 2,
    themeIds: ["theme:systems", "theme:identity"],
    onTimeline: true,
    flagged: false,
    aliases: ["chatter app", "chatter brand"],
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
    id: "project:talent-management",
    slug: "talent-management",
    name: "Talent Management",
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
    aliases: ["talent management", "atls"],
  },
  {
    id: "project:whitelist",
    slug: "whitelist",
    name: "Whitelist",
    summary: "A mobile-first field tool that identifies drone technology, with verifiable reasoning behind every verdict.",
    sections: [section("summary", "Summary", "A mobile-first field tool that identifies drone technology, with verifiable reasoning behind every verdict.")],
    start: 2024.13,
    end: 2026.56,
    roleId: "role:lazarus",
    clientId: "client:lazarus",
    lane: 0,
    themeIds: ["theme:ai", "theme:trust"],
    onTimeline: true,
    flagged: false,
    aliases: ["whitelist", "drone"],
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
    lane: 2,
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
    lane: 2,
    themeIds: ["theme:ai", "theme:trust", "theme:systems"],
    onTimeline: true,
    flagged: true,
    aliases: ["remedy"],
  },
  {
    id: "project:rv",
    slug: "rv",
    name: "RV",
    summary: "Public work for this client during the current role.",
    sections: [section("summary", "Summary", "Public work for this client during the current role.")],
    start: 2026.04,
    end: null,
    roleId: "role:employer",
    clientId: "client:rv",
    lane: 2,
    themeIds: ["theme:systems"],
    onTimeline: true,
    flagged: true,
    aliases: ["rv"],
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
    lane: 2,
    themeIds: ["theme:finance"],
    onTimeline: true,
    flagged: false,
    aliases: ["intuit"],
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
  {
    id: "project:lzr-2",
    slug: "lzr-2",
    name: "LZR 2.0",
    summary: "One company. Three readers. One argument.",
    sections: [
      section(
        "summary",
        "Summary",
        "AI for regulated industries is sold against suspicion. LZR 2.0 restates Lazarus for three readers: the practitioner, the buyer, the researcher. Each arrives with a different doubt. Each is answered in turn. Explainability is the organizing idea.",
      ),
    ],
    start: 2025.6,
    end: 2026.5,
    roleId: "role:lazarus",
    clientId: "client:lazarus",
    lane: 0,
    themeIds: ["theme:identity", "theme:ai", "theme:trust"],
    onTimeline: true,
    flagged: false,
    aliases: ["lzr 2.0", "lzr 2", "lzr", "lazarus website"],
  },
  {
    id: "project:overmatch-ai",
    slug: "overmatch-ai",
    name: "Overmatch AI",
    summary: "Product and platform UI, brand identity and website.",
    sections: [section("summary", "Summary", "Product and platform UI, brand identity and website. In progress.")],
    start: 2026.35,
    end: null,
    roleId: "role:overmatch",
    clientId: "client:overmatch",
    lane: 1,
    themeIds: ["theme:ai", "theme:systems"],
    onTimeline: true,
    flagged: false,
    aliases: ["overmatch ai work"],
  },
]

function client(id: string, name: string, roleId: string, projectIds: string[], extra: Partial<Client> = {}): Client {
  return { id, name, usesEmployerName: false, roleId, projectIds, ...extra }
}

const clients: Client[] = [
  client("client:joba", "Joba Studio", "role:joba", ["project:usm-hue-man", "project:usm-milan"]),
  client("client:soul-machines", "Soul Machines", "role:soul-machines", ["project:corelogic", "project:nestle"]),
  client("client:urvin", "Urvin Finance", "role:urvin", ["project:the-terminal"]),
  client("client:jet", "Jet Protocol", "role:jet", ["project:fixed-rate-fixed-term"]),
  client("client:nax", "Nax Group", "role:nax", ["project:novart"]),
  client("client:chatter", "Chatter Social", "role:chatter", ["project:chatter"]),
  client("client:lazarus", "Lazarus AI", "role:lazarus", ["project:lazarus-brand", "project:model-playground", "project:talent-management", "project:whitelist", "project:lzr-2"]),
  client("client:loblaw-pc-health", "Loblaw / PC Health", "role:employer", ["project:loblaw", "project:remedy"]),
  client("client:intuit", "Intuit", "role:employer", ["project:intuit"]),
  client("client:rv", "RV", "role:employer", ["project:rv"]),
  client("client:overmatch", "Overmatch AI", "role:overmatch", ["project:overmatch-ai"]),
  client("client:own", "Side project", "role:own", ["project:traveller"]),
]

const roles: Role[] = [
  role("role:joba", "Joba Studio", "Designer", 2019.35, 2021.55, `2019${en}21`, 0, ["client:joba"], ["joba", "joba studio"], {
    summary: "Led design across environmental, product and web projects. Reported directly to the CEO and Creative Director, running project execution and growing the designers on staff.",
  }),
  role("role:soul-machines", "Soul Machines", "Designer", 2021.6, 2022.55, `2021${en}22`, 1, ["client:soul-machines"], ["soul machines", "soul"], {
    summary: "Sole designer on web and mobile experiences featuring AI digital humans for enterprise clients including Nestlé and CoreLogic. Designed conversational interfaces that streamlined customer service and specialised workflows.",
  }),
  role("role:urvin", "Urvin Finance", "Designer", 2022.1, 2022.7, "2022", 2, ["client:urvin"], ["urvin"], {
    summary: "Designed and researched a fintech platform born from the GameStop and Robinhood market events. Shipped charting tools, social features, news feeds and educational content focused on market transparency.",
  }),
  role("role:jet", "Jet Protocol", "Designer", 2022.78, 2023.8, `2022${en}23`, 0, ["client:jet"], ["jet protocol"], {
    summary: "Led product design and a brand refresh for a DeFi platform on Solana. Designed the end-to-end trading experience, from lending and borrowing to trading and governance, making complex blockchain functionality accessible.",
  }),
  role("role:nax", "Nax Group", "Designer", 2023.1, 2023.65, "2023", 1, ["client:nax"], ["nax", "nax group"], {
    summary: "Led product design for an art lending platform that let collectors borrow against their collections to grow their portfolios. Designed the core experience bridging fine art and financial services.",
  }),
  role("role:chatter", "Chatter Social", "Design Director", 2023.78, 2025.7, `2023${en}25`, 2, ["client:chatter"], ["chatter social", "chatter"]),
  role("role:lazarus", "Lazarus AI", "Design Lead", 2024.13, 2026.56, `2024${en}26`, 0, ["client:lazarus"], ["lazarus", "lazarus ai"]),
  role("role:employer", "", "Senior Product Designer", 2026.04, null, `2026${en}`, 2, ["client:loblaw-pc-health", "client:intuit", "client:rv"], ["current role", "current employer"], {
    employer: true,
    since: "Jan 2026",
  }),
  role("role:overmatch", "Overmatch AI", "Design Lead", 2026.35, null, `2026${en}`, 1, ["client:overmatch"], ["overmatch ai", "overmatch"], {
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

/** Order and Circa from the Notion intake, by the site's slug. */
function notionFields(slug: string): { order?: number; circa?: string } {
  const entry = (notionProjects.projects as Record<string, { order?: number; circa?: string }>)[slug]
  return entry ? { order: entry.order, circa: entry.circa } : {}
}

export function loadCatalog(): Catalog {
  const publicNames = new Map(projects.filter((project) => !project.flagged).map((project) => [project.slug, project.name]))
  return CatalogSchema.parse({
    profile: {
      id: "profile:tyler",
      name: "Tyler Jackson",
      title: "Designer",
      location: "Miami",
      placeId: "place:miami",
      email: "jacksontylerbruce@gmail.com",
      linkedin: "https://www.linkedin.com/in/tyler-jackson-0a1154181/",
    },
    places,
    themes,
    roles,
    clients,
    projects: projects.map((project) => ({
      ...project,
      ...notionFields(project.slug),
      sections: generateSections(project.slug, project.sections, publicNames),
      media: mediaFor(project.slug, project.name),
    })),
    relations: relations(),
  })
}
