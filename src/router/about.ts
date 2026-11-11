import { isHome } from "@/src/content/home"
import "server-only"
import { textIssues } from "@/src/content/guard"
import { publishCatalog, type PublicCatalog } from "@/src/content/publish"
import type { Place } from "@/src/content/schema"
import { REGIONS } from "@/src/globe/regions"
import { keywordRoute } from "./keyword"
import { qaReply } from "./qa"
import type { Go } from "./navigate"

/** One reply about places, given in the conversation. placeId names the place the globe should turn to, when there is one. */
/** only narrows the globe to one kind of place, when the answer is about just that kind. */
export type AboutReply = { answer: string; placeId: string | null; go?: Go; followUps?: string[]; contact?: boolean; only?: "lived" }

const list = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`)
const fold = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
/** Whole words only, so "Goa" does not match "goal" and "Rome" does not match "chrome". */
const has = (q: string, term: string) => new RegExp(`(^|[^a-z])${escape(fold(term))}([^a-z]|$)`).test(q)

/** Short forms people type, mapped to place slugs and country names. */
const CITY_ALIASES: Record<string, string> = { nyc: "new-york", sf: "san-francisco", dc: "washington-dc", "washington dc": "washington-dc" }
const COUNTRY_ALIASES: Record<string, string> = { uk: "United Kingdom", england: "United Kingdom", britain: "United Kingdom", "dominican republic": "Dominican Republic", "the dr": "Dominican Republic" }

const where = (place: Place) => (place.kind === "lived" ? "Lived there for a while" : "Travelled there")

/**
 * Origin and current place are different questions.
 * "Where is he from" is "From Miami." "Where is he located" is "Based in Miami."
 * A "from" inside some other question ("a project from Joba") is left alone.
 */
export function homeLine(question: string, location: string): string | null {
  const q = fold(question)
  const him = /\b(tyler|he|him|his|you|your)\b/.test(q)
  if (/\bwhere\b/.test(q) && /\bfrom\b/.test(q) && !/\b(lived|worked|travel)/.test(q)) return `From ${location}.`
  if (him && /\blocated\b/.test(q)) return `Based in ${location}.`
  return null
}

/** Grounded answers about where Tyler is, has lived and has travelled, from the places content. */
export function answerAbout(question: string, catalog: PublicCatalog = publishCatalog()): AboutReply {
  const q = fold(question)
  const { places, profile } = catalog
  const line = homeLine(question, profile.location)
  if (line) {
    const here = places.find((place) => place.id === profile.placeId) ?? places[0]
    return { answer: line, placeId: here?.id ?? null }
  }
  const qa = qaReply(question)
  if (qa) {
    // A place answer turns the globe home.
    const placeId = qa.panel === "globe" ? profile.placeId : null
    return { answer: qa.answer, placeId, ...(qa.followUps ? { followUps: qa.followUps } : {}), ...(qa.contact ? { contact: true } : {}) }
  }
  const home = places.find((place) => place.id === profile.placeId) ?? places[0]
  const countries = [...new Set(places.map((place) => place.country))]
  const homeId = home?.id ?? null

  // A city, by name or short form.
  const aliased = Object.entries(CITY_ALIASES).find(([alias]) => has(q, alias))?.[1]
  const city = places.find((place) => place.id === `place:${aliased}`) ?? places.find((place) => has(q, place.name.split(",")[0]))
  if (city) {
    if (isHome(city, profile)) return { answer: `${city.name}. Home. Based in ${profile.location}.`, placeId: city.id }
    return { answer: `Yes, ${city.name}, ${city.country}. ${where(city)}.`, placeId: city.id }
  }

  // A country, by name or short form.
  const country = countries.find((name) => has(q, name)) ?? Object.entries(COUNTRY_ALIASES).find(([alias]) => has(q, alias))?.[1]
  if (country && countries.includes(country)) {
    const here = places.filter((place) => place.country === country)
    const lived = here.filter((place) => place.kind === "lived").map((place) => place.name)
    const tail = lived.length ? ` Lived in ${list(lived)}.` : ""
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
    const answer = `Not yet. ${named} isn't among the ${countries.length} countries so far.`
    return { answer: textIssues(answer).length ? `Not on the list. ${countries.length} countries so far.` : answer, placeId: null }
  }

  if (has(q, "how many") || has(q, "count") || has(q, "number of")) {
    return { answer: `${places.length} places across ${countries.length} countries: ${list(countries)}.`, placeId: homeId }
  }
  if (/\b(lived|live|moved|stayed)\b/.test(q) && !/\bbased\b/.test(q)) {
    const lived = places.filter((place) => place.kind === "lived").map((place) => place.name)
    return { answer: `Lived in ${list(lived)}, each for a month or more. Home is ${profile.location}.`, placeId: homeId, only: "lived" }
  }
  if (/\b(travel|travelled|traveled|trips?|been|visited|countries|places|cities|globe|world|map)\b/.test(q)) {
    return {
      answer: `${places.length} places across ${countries.length} countries, from ${list(countries.slice(0, 4))} to ${list(countries.slice(-2))}. Hover the globe, or ask about a country or a city.`,
      placeId: homeId,
    }
  }
  if (/\bwhere\b/.test(q) && /\bfrom\b/.test(q) && !/\b(lived|worked|travel)/.test(q)) {
    return { answer: `From ${profile.location}.`, placeId: homeId }
  }
  if (/\b(where|based|located)\b/.test(q)) {
    return { answer: `Based in ${profile.location}.`, placeId: homeId }
  }
  const routed = keywordRoute(question)
  if (routed.intent === "off_topic") {
    return { answer: "The globe covers places lived and travelled. Ask about a country, a city or a part of the world.", placeId: null }
  }
  return { answer: routed.annotation, placeId: null }
}
