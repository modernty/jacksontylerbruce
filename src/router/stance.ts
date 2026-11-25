import data from "@/content/principles.json"
import { PRINCIPLES, type Principle } from "@/src/content/principles"

/**
 * Opinion questions ("what's your take on AI?", "how do you think about memory?") are answered
 * with the point of view itself, not a project. The project that proves it comes along as the card.
 */
/** broad is true when no one principle was asked about, so an exact Q&A answer can win. */
export type StanceReply = { answer: string; projects: string[]; followUps: string[]; broad?: boolean }

const fold = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/['’]/g, "")

// Asking for a view rather than a fact or a project.
const OPINION = /\b(take|takes|think|thoughts?|believe|beliefs?|opinions?|view|views|stance|perspective|philosophy|feel about|stand on|pov|point of view|convictions?|principles?|approach to)\b/

/** What each principle is about, in the words a visitor would use. */
const TOPICS: Record<string, RegExp> = {
  remember: /\b(memory|memories|remember\w*|forget\w*|privacy|private|consent|personal data|personali[sz]\w*|surveillance|creepy)\b/,
  "useful-first": /\b(onboard\w*|first message|first impression|relationships?|useful|helpful|value first|earn\w* trust|setup|set up)\b/,
  surface: /\b(chat|chats|chatbots?|conversation\w*|conversational|interfaces?|ui|screens?|surfaces?)\b/,
  "show-the-working": /\b(trust\w*|transparen\w*|explainab\w*|reasoning|autonom\w*|black box|control|human in the loop|oversight|agents?|agentic|regulated)\b/,
  "one-voice": /\b(voice|personality|persona|tone|multi.?agents?|brand|identity)\b/,
  handoff: /\b(handoffs?|hand off|engineer\w*|developers?|devs?|specs?|shipping|ship|build\w*|implementation)\b/,
}
// Broad AI and design questions get the whole point of view, briefly.
const BROAD = /\b(ai|a\.i\.|artificial intelligence|llms?|ai design|design|future|headed|where .* going)\b/

const projectsFor = (id: string) =>
  Object.entries(data.projects as Record<string, string>)
    .filter(([, principle]) => principle === id)
    .map(([slug]) => slug)

/** A follow-up for each principle, as the question a visitor would ask next. */
const ASK: Record<string, string> = {
  remember: "How should AI handle memory?",
  "useful-first": "How does an agent earn trust?",
  surface: "Is chat the future of interfaces?",
  "show-the-working": "How much autonomy should an agent get?",
  "one-voice": "One agent or many?",
  handoff: "How do you hand off AI work to engineering?",
}

function nextAsks(skip?: string): string[] {
  return PRINCIPLES.filter((principle) => principle.id !== skip).map((principle) => ASK[principle.id]).filter(Boolean).slice(0, 2)
}

function one(principle: Principle, publicSlugs: Set<string>): StanceReply {
  const projects = projectsFor(principle.id).filter((slug) => publicSlugs.has(slug)).slice(0, 2)
  return { answer: `${principle.title} ${principle.body}`, projects, followUps: nextAsks(principle.id) }
}

/** The principle a question asks about, matched by topic words. */
function principleIn(q: string): Principle | undefined {
  return PRINCIPLES.find((principle) => TOPICS[principle.id]?.test(q))
}

/** The stance a question asks for, or null when it isn't asking for a view. */
export function stanceReply(question: string, publicSlugs: Set<string>): StanceReply | null {
  const q = fold(question)
  // One of the follow-ups above: answered as asked, without needing an opinion word.
  const asked = Object.entries(ASK).find(([, prompt]) => fold(prompt) === q.trim())
  if (asked) {
    const principle = PRINCIPLES.find((item) => item.id === asked[0])
    return principle ? one(principle, publicSlugs) : null
  }
  if (!OPINION.test(q)) return null
  const principle = principleIn(q)
  if (principle) return one(principle, publicSlugs)
  if (!BROAD.test(q)) return null
  const titles = PRINCIPLES.map((item) => item.title)
  return {
    answer: `Six principles behind the work. ${titles.join(" ")}`,
    projects: [],
    broad: true,
    followUps: nextAsks().concat("Show me some case studies.").slice(0, 3),
  }
}
