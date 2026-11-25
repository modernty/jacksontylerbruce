import "server-only"
import type { PublicCatalog } from "@/src/content/publish"
import { openableFor } from "@/src/content/demos"
import { mentionedProjects } from "./keyword"

/** Where a question should take the visitor. handoff and chat both replay the question in the main conversation. */
export type Go = { href: string; handoff?: boolean; chat?: boolean }

/** A reply that moves the visitor, or changes the view, instead of answering where they are. */
export type Route = { answer: string; go?: Go; view?: "images" }

type Here = { page: "project"; slug: string }

const fold = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()

const CONTACT = /\b(contact|e-?mail|linkedin|get in touch|reach (you|him|them|tyler|out)|hire (you|him|them|tyler)|work with (you|him|them|tyler)|book a call)\b/
const COMMAND = /^(?:(?:please|hey|ok|okay|can you|could you|would you)\s+)*(?:take|bring|go|head|jump|navigate|open|show|see|view|back)\b|\btake me\b|\bback to\b/
const COMPARE = /\b(compare|compared|versus|vs|differ|different|difference|connect|connects|relate|relates|similar|like)\b/
const TRAVEL = /\b(travell?ed|travell?ing|travels?|trips?|countries|globe|world map|about page|been to|visited|lived in|have you lived|where (?:has|have) .*\b(?:been|lived))\b/
const ALL_WORK = /\b(projects|portfolio|all (?:of )?(?:your|the|tyler'?s) work|other work)\b/
const TIMELINE = /\b(timeline|career|home ?page|start over)\b/
const BACK = /\b(?:go|take me|bring me)\s+back\b/
/** Asking to look: a verb of seeing or opening. */
const SEE = /\b(show|see|view|open|look|watch|play|browse|display|pull (?:it |them )?up|bring (?:it |them )?up|walk (?:me )?through|flip through|scroll through|tour|try)\b/
/** What there is to look at. */
const VISUAL = /\b(images?|photos?|pictures?|pics|visuals?|gallery|media|screens?|screenshots?|designs?|mock-?ups?|frames?|plates?|demos?|prototypes?|videos?|animations?|case stud(?:y|ies)|study|examples?|ui|interface|the work|the product|the app)\b/
/** Questions about the look itself. */
const LOOKS = /\bwhat\b.{0,30}\blook(?:s|ed)? like\b|\bhow (?:does|did|do|would|will) (?:it|this|that|they|the \w+) look\b|\bhow it works\b|\bin action\b/
/** Seeing what was made: "can I see what you built?", "show me what you designed". */
const SEE_MADE = /\b(?:show|see|view)\b.{0,12}\bwhat (?:you|was|got|they) (?:made|built|designed|shipped|created|did)\b/
/** A short command about the project itself: "open it", "can I see it?", "let me see that". */
const SEE_IT = /^(?:(?:please|so|ok|okay|can i|could i|can you|could you|let me|i want to|i'd like to|i would like to)\s+)*(?:show me|see|view|open|look at|watch|play)\s+(?:it|this|that|them|this one|more)\b/
/** A message that is only the thing to look at: "Media", "the demo?", "Screens". */
const VISUAL_ONLY = /^(?:the |some |any )?(images?|photos?|pictures?|visuals?|gallery|media|screens?|screenshots?|designs?|demos?|prototypes?|case study|videos?)[?!.]*$/
/** Asking whether there is anything to look at: "got anything visual?", "is there a demo?", "any screens?". */
const ANY_VISUAL = /\b(anything|something|any|is there an?|are there|do you have|got)\b.{0,24}\b(visual|visuals|to see|to look at|to show|images?|screens?|screenshots?|demos?|prototypes?|designs?|videos?|pictures?)\b/
/** Asking what was done or why, which an answer covers better than pictures. */
const ASKS_WHY = /\b(why|role|approach|approached|outcome|result|impact|process|decide|decided|learn|learned|challenge)\b/

/** Whether a question on a project page asks to see the project's media. */
export function wantsMedia(question: string): boolean {
  const q = fold(question).trim()
  if (LOOKS.test(q) || SEE_MADE.test(q) || VISUAL_ONLY.test(q) || SEE_IT.test(q) || ANY_VISUAL.test(q)) return true
  return SEE.test(q) && VISUAL.test(q) && !ASKS_WHY.test(q)
}

/** What a project's media holds: its demo, its study's chapters and site, its images. */
export function mediaCount(project: PublicCatalog["projects"][number]): number {
  const open = openableFor(project.slug)
  return (open.portal ? 1 : 0) + (open.reel ? 1 : 0) + (open.demo ? 1 : 0) + (open.study?.chapters.length ?? 0) + (open.study?.site ? 1 : 0) + (project.media?.images.length ?? 0) + (project.media?.cover ? 1 : 0)
}

/** The reply to a request for the media: it opens beside the conversation, or there is none yet. */
export function mediaReply(project: PublicCatalog["projects"][number] | undefined): Route {
  if (!project || !mediaCount(project)) return { answer: `There's no media for ${project?.name ?? "this project"} yet. Ask about the approach, the outcome or the core ideas.` }
  return { answer: `Here is the media from ${project.name}. Scroll to move through it.`, view: "images" }
}

/** Whether a question is about where Tyler has been, which the globe on the About page answers. */
export function aboutTravel(question: string): boolean {
  return TRAVEL.test(fold(question))
}

export function contactReply(catalog: PublicCatalog): string {
  return `Email ${catalog.profile.email}. You can also connect on LinkedIn, linked at the top of the page.`
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

  if (here.page === "project" && TRAVEL.test(q)) return { answer: "Taking that to the conversation.", go: { href: "/chat", chat: true } }
  if (ALL_WORK.test(q)) return { answer: "Opening the work.", go: { href: "/chat", chat: true } }
  if (TIMELINE.test(q)) return { answer: "Here's the timeline.", go: { href: "/timeline#axis" } }
  if (BACK.test(q)) return { answer: "Taking you back.", go: { href: "back" } }

  if (here.page === "project" && wantsMedia(question)) return mediaReply(catalog.projects.find((item) => item.slug === here.slug))
  return null
}
