import "server-only"
import { z } from "zod"
import { containsBlocked, textIssues } from "@/src/content/guard"
import { publishCatalog, type PublicCatalog } from "@/src/content/publish"
import type { Place } from "@/src/content/schema"
import { REGIONS } from "@/src/globe/regions"
import { keywordRoute } from "./keyword"
import { MAX_CHARS, counterFromEnv, memoryCounter, underLimit, type Counter } from "./limits"
import { routeQuestion, type Go } from "./navigate"

/** One reply about Tyler. placeId names a place the globe should turn to, when there is one. */
export type AboutReply = { answer: string; placeId: string | null; go?: Go }

const AboutAsk = z.object({ q: z.string(), sessionId: z.string().min(1).max(80) })

const list = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`)
const fold = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
/** Whole words only, so "Goa" does not match "goal" and "Rome" does not match "chrome". */
const has = (q: string, term: string) => new RegExp(`(^|[^a-z])${escape(fold(term))}([^a-z]|$)`).test(q)

/** Short forms people type, mapped to place slugs and country names. */
const CITY_ALIASES: Record<string, string> = { nyc: "new-york", sf: "san-francisco", dc: "washington-dc", "washington dc": "washington-dc" }
const COUNTRY_ALIASES: Record<string, string> = { uk: "United Kingdom", england: "United Kingdom", britain: "United Kingdom", "dominican republic": "Dominican Republic", "the dr": "Dominican Republic" }

const where = (place: Place) => (place.kind === "lived" ? "lived there for a while" : "travelled there")

/** Grounded answers about where Tyler is, has lived and has travelled, from the places content. */
export function answerAbout(question: string, catalog: PublicCatalog = publishCatalog()): AboutReply {
  const q = fold(question)
  const { places, profile } = catalog
  const home = places.find((place) => place.id === profile.placeId) ?? places[0]
  const countries = [...new Set(places.map((place) => place.country))]
  const homeId = home?.id ?? null

  // A city, by name or short form.
  const aliased = Object.entries(CITY_ALIASES).find(([alias]) => has(q, alias))?.[1]
  const city = places.find((place) => place.id === `place:${aliased}`) ?? places.find((place) => has(q, place.name.split(",")[0]))
  if (city) {
    if (city.id === homeId) return { answer: `${city.name} is home. It's where I'm based now.`, placeId: city.id }
    return { answer: `Yes, ${city.name}, ${city.country}. I ${where(city)}.`, placeId: city.id }
  }

  // A country, by name or short form.
  const country = countries.find((name) => has(q, name)) ?? Object.entries(COUNTRY_ALIASES).find(([alias]) => has(q, alias))?.[1]
  if (country && countries.includes(country)) {
    const here = places.filter((place) => place.country === country)
    const lived = here.filter((place) => place.kind === "lived").map((place) => place.name)
    const tail = lived.length ? ` I lived in ${list(lived)}.` : ""
    return { answer: `Yes. In ${country}: ${list(here.map((place) => place.name))}.${tail}`, placeId: (here.find((place) => place.kind === "lived") ?? here[0])?.id ?? null }
  }

  // A part of the world.
  const regions = REGIONS.filter((region) => region.words.some((word) => has(q, word)))
  if (regions.length) {
    const inRegion = places.filter((place) => regions.some((region) => (region.countries as readonly string[]).includes(place.country)))
    if (inRegion.length) {
      const byCountry = [...new Set(inRegion.map((place) => place.country))].map((name) => `${name} (${list(inRegion.filter((place) => place.country === name).map((place) => place.name))})`)
      return { answer: `In ${list(regions.map((region) => region.name))}: ${byCountry.join("; ")}.`, placeId: (inRegion.find((place) => place.kind === "lived") ?? inRegion[0])?.id ?? null }
    }
  }

  // Somewhere not on the list.
  const asked = q.match(/\b(?:been to|visited|visit|gone to|go to|travell?ed to|lived in|live in)\s+([a-z][a-z .'-]{1,40}?)\s*(?:\?|$|,|\.)/)?.[1]?.trim()
  if (asked && !/^(any|anywhere|places?|countries|cities|where)\b/.test(asked)) {
    const named = asked.replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    const answer = `Not yet. ${named} isn't one of the ${countries.length} countries I've been to.`
    return { answer: textIssues(answer).length ? `Not that I've listed. I've been to ${countries.length} countries.` : answer, placeId: null }
  }

  if (has(q, "how many") || has(q, "count") || has(q, "number of")) {
    return { answer: `${places.length} places across ${countries.length} countries: ${list(countries)}.`, placeId: homeId }
  }
  if (/\b(lived|live|moved|stayed)\b/.test(q) && !/\bbased\b/.test(q)) {
    const lived = places.filter((place) => place.kind === "lived").map((place) => place.name)
    return { answer: `I've lived in ${list(lived)}, each for a month or more. Home is ${home?.name}.`, placeId: homeId }
  }
  if (/\b(travel|travelled|traveled|trips?|been|visited|countries|places|cities|globe|world|map)\b/.test(q)) {
    return {
      answer: `I've been to ${places.length} places across ${countries.length} countries, from ${list(countries.slice(0, 4))} to ${list(countries.slice(-2))}. Hover the globe, or ask me about a country or a city.`,
      placeId: homeId,
    }
  }
  if (/\b(where|based|located|from)\b/.test(q)) {
    return { answer: `I'm based in ${profile.location}.`, placeId: homeId }
  }
  const routed = keywordRoute(question)
  if (routed.intent === "off_topic") {
    return { answer: "I can tell you where I've lived and travelled. Ask me about a country, a city or a part of the world.", placeId: null }
  }
  return { answer: routed.annotation, placeId: null }
}

export async function handleAboutAsk(raw: unknown, ctx: { ip: string }, deps: { counter?: Counter; now?: number } = {}): Promise<{ status: number; body: unknown }> {
  const parsed = AboutAsk.safeParse(raw)
  if (!parsed.success) return { status: 400, body: { error: "Expected {q, sessionId}." } }
  const question = parsed.data.q.trim()
  if (!question) return { status: 400, body: { error: "Ask a question." } }
  if (question.length > MAX_CHARS) return { status: 400, body: { error: "Question is capped at 400 characters." } }
  const now = deps.now ?? Date.now()
  const counter = deps.counter ?? counterFromEnv()
  const allowed = await underLimit(ctx.ip || "local", now, counter).catch(() => underLimit(ctx.ip || "local", now, memoryCounter))
  if (!allowed) return { status: 429, body: { error: "Too many questions. Try again in a few minutes." } }
  if (containsBlocked(question)) return { status: 200, body: { answer: "I only talk about my public work and where I've been.", placeId: null } }
  const route = routeQuestion(question, publishCatalog(), { page: "about" })
  return { status: 200, body: route ? { answer: route.answer, placeId: null, go: route.go } : answerAbout(question) }
}
