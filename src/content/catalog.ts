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
    title: "Product Design Lead",
    aliases: ["model playground", "playground"],
  },
  {
    id: "project:usm-milan",
    slug: "usm-milan",
    name: "USM: Milan",
    summary: "An immersive Haller Soft Panel installation for Milan Design Week, with Joba Studio.",
    sections: [section("summary", "Summary", "USM Haller has been steel tubes and chrome balls since 1965. At Milan Design Week 2025, it received a soft surface. Connected by Our Dreams, USM's installation at the Spotti showroom, debuted the Haller Soft Panel, made with Joba Studio. Rigid frame, soft skin, the same grammar.")],
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
    title: "Product Design Lead",
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
    slug: "loblaws",
    name: "Loblaws / PC Health",
    summary: "The handoff for PC Chat's Chat History and Memory: a living spec of every screen, state and rule, built from the design files and readable by engineering.",
    sections: [section("summary", "Summary", "Health care is a maze, and PC Health puts a front door inside a loyalty app: nurses and dietitians on call, health goals paid in PC Optimum points. As PC Chat, its assistant, takes on more, two features decide whether people trust it: Chat History and Memory. This is their handoff, a living spec of every screen, state and rule that engineering can read, built from the live design files so the spec and the design never drift apart."),
      section("approach", "Approach", "PC Health launched in October 2020 with free chat with registered nurses, dietitians and care navigators, and a marketplace of health products and services. The 2026 work spans new features, an app redesign and Labs concepts for agentic health and commerce. Chat History and Memory were designed and handed off end to end, as a spec the product can be built from.")],
    start: 2026.04,
    end: null,
    roleId: "role:employer",
    clientId: "client:loblaw-pc-health",
    lane: 2,
    themeIds: ["theme:systems", "theme:ai", "theme:trust"],
    onTimeline: true,
    flagged: false,
    aliases: ["loblaw", "loblaws", "pc health"],
  },
  {
    id: "project:pc-chat",
    slug: "pc-chat",
    name: "PC Chat",
    summary: "An AI health agent for Shoppers Drug Mart. Refills and renewals in one conversation, sources on every answer, and a pharmacist when a person should take over. Launched June 2026.",
    sections: [
      section("summary", "Summary", "PC Chat is the AI health agent for Shoppers Drug Mart. Refills, renewals and questions start from a person's own words, never a menu, and resolve in one conversation. Every answer shows its sources, and a pharmacist steps in when a person should. It launched on iOS in June 2026, then grew to booking, vaccines and web for the national launch."),
      section("agent", "One agent", "Separate assistants became one. The pharmacy agent and the store's chat folded into a single agent with one name and one context, its authority changing with the moment: a pharmacist's sign-off in health, the store in commerce."),
    ],
    start: 2026.04,
    end: 2026.67,
    roleId: "role:employer",
    clientId: "client:loblaw-pc-health",
    lane: 2,
    themeIds: ["theme:ai", "theme:trust", "theme:systems"],
    onTimeline: true,
    flagged: false,
    aliases: ["pc chat", "remedy", "pharmacy agent", "shoppers", "refills", "pc one"],
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
    summary: "Invoicing with no destination. Invoice, payment and wallet fold into one ChatGPT conversation, with a single link out. The coded prototype, voice included, won sign-off for a larger effort.",
    sections: [section("summary", "Summary", "Invoicing has always needed a destination: an app to open, a dashboard to check. Inside ChatGPT, it doesn't. Invoice, payment and Intuit Wallet fold into one conversation, and the only link out is to QuickBooks. Information appears only where it's needed, with the benefits at send and not before. The coded prototype, voice included, won sign-off for a larger effort."),
      section("approach", "Approach", "Seven touchpoints, one conversation: the creation prompt, preview and send, confirmation, sign-up, Wallet setup, the payment notice and a revenue card. A few decisions hold it together. Benefits appear at send, not before. \"View in QuickBooks\" is the only link out. The revenue card shows the total and the weekly change, nothing else. And Wallet speaks to three things only: instant payouts, paying vendors, one place for money.")],
    start: 2026.45,
    end: null,
    roleId: "role:employer",
    clientId: "client:intuit",
    lane: 2,
    themeIds: ["theme:finance", "theme:ai"],
    onTimeline: true,
    flagged: false,
    aliases: ["intuit", "quickbooks", "intuit wallet"],
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
      section("summary", "Summary", "AI for regulated industries is sold against suspicion. Insurers, health systems, banks and governments won't buy a black box, and each person deciding arrives with a different doubt. LZR 2.0 restates Lazarus AI for three of them: the practitioner, the buyer and the researcher. Each doubt is answered in turn, with explainability as the organizing idea."),
      section("approach", "Approach", "The website and product marketing for the LZR 2.0 phase, from August 2025. The homepage speaks to all three readers at once; product pages carry the RikAI and ATLS models; research and benchmark pages give the researcher the evidence. Every page answers one doubt, and shows its reasoning to do it."),
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
    sections: [section("summary", "Summary", "Overmatch AI is in progress, and already delivering. A handoff is in the customer's hands, Transitions has been delivered, and a simple demonstration is to come. The product and platform UI, the brand identity and the website are designed together, as one system.")],
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
  {
    id: "project:botpress",
    slug: "botpress",
    name: "Botpress",
    summary: "Support work is moving to agents. A concept that grows Botpress into the place a support team is run, with Lily as chief of support, handed more as she proves herself.",
    sections: [
      section("summary", "Summary", "Support work is moving to agents, and the support team's job is moving with it: from working tickets to running a team of agents. Botpress gives support leads a builder for agents and Desk to watch the tickets, but nothing to run those agents as a team. This concept grows Botpress into the place support is run, with Lily, the assistant already in the product, as chief of support. She directs the agents, and is handed more as she proves herself. Two design sprints, built on what the Botpress engagement and audit found."),
      section("ladder", "Built in stages", "A chief of support is handed more as they prove themselves. That trust curve is why the product grows in stages: Lily helps set up, introduces Desk, suggests, drafts for approval, acts alone within limits, then runs the desk. Each skill and each limit unlocks from a record of approvals."),
      section("leads", "Where it leads", "Higher up the curve, support agents resolve instead of reply. A customer reports a broken link, a dev agent stages the fix, the right person approves it in Slack, and it ships. People direct; Lily operates."),
      section("credit", "Credit", "A concept study with Nate. Loopkit and its numbers are sample data. Directional, not a spec."),
    ],
    start: 2026.87,
    end: null,
    roleId: "role:employer",
    clientId: "client:botpress",
    lane: 2,
    themeIds: ["theme:ai", "theme:trust"],
    onTimeline: true,
    flagged: false,
    aliases: ["botpress", "lily", "desk", "trusted helpdesk", "helpdesk"],
  },
  {
    id: "project:pc-chat-memory",
    slug: "pc-chat-memory",
    name: "PC Chat: Memory",
    summary: "What a health assistant should remember, and how it asks. 12 labs across four tensions, scored against PC Chat's live screens. The moment a memory is made matters most.",
    sections: [
      section("summary", "Summary", "An assistant that remembers can feel like it knows you, or like it's watching. PC Chat, Loblaw's health assistant, remembers health facts from conversation: a condition, a medication, an allergy, a pregnancy. This study asks what it should remember and how it should ask, and scores the live product against 12 labs across four tensions."),
      section("labs", "12 labs", "Four tensions: forgetful or presumptuous, cold or creepy, interruptive or buried, black box or overexplained. Three labs each, from Remember with permission to Provenance on everything. Scored against PC Chat: 13 gaps, 10 supports, 3 mixed. The gaps cluster in two places: when a memory is made, and how long it lasts."),
    ],
    start: 2026.75,
    end: 2026.85,
    roleId: "role:employer",
    clientId: "client:loblaw-pc-health",
    lane: 2,
    themeIds: ["theme:trust", "theme:ai"],
    onTimeline: true,
    flagged: false,
    aliases: ["memory", "pc chat memory", "memory study", "consent"],
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
  client("client:loblaw-pc-health", "Loblaws / PC Health", "role:employer", ["project:loblaw", "project:pc-chat", "project:pc-chat-memory"]),
  client("client:intuit", "Intuit", "role:employer", ["project:intuit"]),
  client("client:rv", "RV", "role:employer", ["project:rv"]),
  client("client:botpress", "Botpress", "role:employer", ["project:botpress"]),
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
  role("role:lazarus", "Lazarus AI", "Design Director", 2024.13, 2026.56, `2024${en}26`, 0, ["client:lazarus"], ["lazarus", "lazarus ai"], {
    titles: ["Product Design Lead", "Design Director"],
  }),
  role("role:employer", "", "Senior Product Designer", 2026.04, null, `2026${en}`, 2, ["client:loblaw-pc-health", "client:intuit", "client:rv", "client:botpress"], ["current role", "current employer"], {
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
      sections: generateSections(project.slug, project.sections),
      media: mediaFor(project.slug, project.name),
    })),
    relations: relations(),
  })
}
