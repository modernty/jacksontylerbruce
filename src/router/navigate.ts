import "server-only"
import type { PublicCatalog } from "@/src/content/publish"
import { mentionedProjects } from "./keyword"

/** Where a question should take the visitor. handoff replays the question on the About chat; chat replays it in the main conversation. */
export type Go = { href: string; handoff?: boolean; chat?: boolean }

/** A reply that moves the visitor, or changes the view, instead of answering where they are. */
export type Route = { answer: string; go?: Go; view?: "images" }

type Here = { page: "project"; slug: string } | { page: "about" }

const fold = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()

const CONTACT = /\b(contact|e-?mail|linkedin|get in touch|reach (you|him|them|tyler|out)|hire (you|him|them|tyler)|work with (you|him|them|tyler)|book a call)\b/
const COMMAND = /^(?:(?:please|hey|ok|okay|can you|could you|would you)\s+)*(?:take|bring|go|head|jump|navigate|open|show|see|view|back)\b|\btake me\b|\bback to\b/
const COMPARE = /\b(compare|compared|versus|vs|differ|different|difference|connect|connects|relate|relates|similar|like)\b/
const TRAVEL = /\b(travell?ed|travell?ing|travels?|trips?|countries|globe|world map|about page|been to|visited|lived in|have you lived|where (?:has|have) .*\b(?:been|lived))\b/
const ALL_WORK = /\b(projects|portfolio|all (?:of )?(?:your|the|tyler'?s) work|other work)\b/
const TIMELINE = /\b(timeline|career|home ?page|start over)\b/
const BACK = /\b(?:go|take me|bring me)\s+back\b/
const IMAGES = /\b(images?|photos?|pictures?|visuals?|gallery|screens?|screenshots?)\b/

/** Whether a question is about where Tyler has been, which the globe on the About page answers. */
export function aboutTravel(question: string): boolean {
  return TRAVEL.test(fold(question))
}

export function contactReply(catalog: PublicCatalog): string {
  return `Write to me at ${catalog.profile.email}, or find me on LinkedIn. Both links are at the top of the page.`
}

/**
 * Decides whether a chat question belongs somewhere else. Null means the page answers it itself.
 * A project page keeps questions about its own project, and an About page keeps questions about
 * places, so "Show me Milan" turns the globe there rather than opening the Milan project.
 */
export function routeQuestion(question: string, catalog: PublicCatalog, here: Here): Route | null {
  const q = fold(question)
  if (CONTACT.test(q)) return { answer: contactReply(catalog) }

  const current = here.page === "project" ? here.slug : null
  const others = mentionedProjects(question, catalog).filter((project) => project.slug !== current)
  const named = others[0]
  const place = catalog.places.some((item) => new RegExp(`\\b${fold(item.name.split(",")[0])}\\b`).test(q))
  const wanted = here.page === "project" ? !COMPARE.test(q) : COMMAND.test(q) && !place
  if (named && others.length === 1 && wanted) return { answer: `Taking you to ${named.name}.`, go: { href: `/work/${named.slug}` } }

  if (here.page === "project" && TRAVEL.test(q)) return { answer: "Let's look at the globe.", go: { href: "/about", handoff: true } }
  if (ALL_WORK.test(q)) return { answer: "Let's look through the work.", go: { href: "/chat", chat: true } }
  if (TIMELINE.test(q)) return { answer: "Here's the timeline.", go: { href: "/timeline#axis" } }
  if (BACK.test(q)) return { answer: "Taking you back.", go: { href: "back" } }

  if (here.page === "project" && IMAGES.test(q)) {
    const project = catalog.projects.find((item) => item.slug === here.slug)
    if (!project?.media?.images.length) return { answer: `I haven't added images for ${project?.name ?? "this project"} yet.` }
    return { answer: `Here are the images from ${project.name}.`, view: "images" }
  }
  return null
}
