import assert from "node:assert/strict"
import { test } from "node:test"
import { textIssues } from "@/src/content/guard"
import { answerAbout } from "./about"

const ask = (q: string) => answerAbout(q)

test("travel and location questions answer from the places content", () => {
  // The Notion Q&A answers its own questions first.
  assert.equal(ask("Where has Tyler travelled?").answer, "Medellín, Tulum, Costa Rica, and more. Living inside a place changes how a problem looks.")
  assert.match(ask("Which places has Tyler been to?").answer, /^56 places across 20 countries/)
  assert.match(ask("Where are you based?").answer, /^Miami\. \d{1,2}:\d{2} [AP]M there\.$/)
  const lived = ask("Where have you lived?")
  assert.match(lived.answer, /Medellín/)
  assert.match(lived.answer, /Home is Miami\.$/)
  assert.match(ask("How many countries have you been to?").answer, /^56 places across 20 countries: United States/)
})

test("countries, cities and short forms turn the globe to the right place", () => {
  const japan = ask("Have you been to Japan?")
  assert.equal(japan.answer, "Yes. In Japan: Tokyo, Kyoto and Osaka.")
  assert.equal(japan.placeId, "place:tokyo")
  assert.equal(ask("Did you go to medellin?").placeId, "place:medellin")
  assert.equal(ask("Ever been to NYC?").placeId, "place:new-york")
  assert.equal(ask("Have you been to the UK?").placeId, "place:london")
  assert.equal(ask("Tell me about Medellín").answer, "Yes, Medellín, Colombia. Lived there for a while.")
  assert.equal(ask("Tell me about Miami").answer, "Miami, FL. Home. Based in Miami.")
  assert.match(ask("Have you been to Columbus?").answer, /Columbus, OH/)
  const colombia = ask("Where did you live in Colombia?")
  assert.match(colombia.answer, /Lived in Medellín/)
})

test("regions answer with their countries and cities", () => {
  const asia = ask("Where in Asia?")
  assert.match(asia.answer, /India \(Mumbai and Goa\)/)
  assert.match(asia.answer, /Japan \(Tokyo, Kyoto and Osaka\)/)
  const europe = ask("What about Europe?")
  assert.match(europe.answer, /^In Europe: /)
  assert.equal(europe.placeId, "place:riva-san-vitale")
  assert.match(ask("Caribbean trips?").answer, /Dominican Republic \(Santo Domingo, Punta Cana and Las Terrenas\)/)
})

test("names match whole words only, and unknown places get an honest no", () => {
  assert.notEqual(ask("What was your goal?").placeId, "place:goa")
  assert.equal(ask("Have you been to Brazil?").answer, "Not yet. Brazil isn't among the 20 countries so far.")
  // A personal question with no Q&A entry gets the fallback and the contact link.
  const colour = ask("What's your favourite colour?")
  assert.equal(colour.answer, "That's one to ask him directly.")
  assert.equal(colour.contact, true)
  assert.match(ask("What colour is the sky?").answer, /Ask about a country, a city or a part of the world/)
})

test("every answer passes the public checks", () => {
  for (const q of ["Where has Tyler travelled?", "Where in Asia?", "Have you been to Japan?", "Where have you lived?", "Have you been to Brazil?"]) {
    assert.deepEqual(textIssues(ask(q).answer), [], q)
  }
})

test("height is answered on About too", () => {
  assert.equal(ask("How tall are you?").answer, "6'2\". 200 lbs.")
})
