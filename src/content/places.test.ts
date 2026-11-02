import assert from "node:assert/strict"
import { test } from "node:test"
import { loadCatalog } from "./catalog"
import { publishCatalog } from "./publish"

test("places hold the confirmed travel list with home first", () => {
  const { places, profile } = publishCatalog()
  assert.equal(places[0]?.id, "place:miami")
  assert.equal(places[0]?.name, profile.location)
  assert.equal(profile.placeId, places[0]?.id)
  assert.equal(places.length, 53)
  assert.equal(new Set(places.map((place) => place.country)).size, 18)
  assert.equal(new Set(places.map((place) => place.id)).size, places.length)
})

test("lived means the seven places Tyler stayed a month or more", () => {
  const lived = loadCatalog().places.filter((place) => place.kind === "lived").map((place) => place.name).sort()
  assert.deepEqual(lived, ["Las Terrenas", "Medellín", "Miami, FL", "Riva San Vitale", "Santa Teresa", "Tulum", "Washington, DC"])
})

test("every place has plausible coordinates for its country", () => {
  const bounds: Record<string, [number, number, number, number]> = {
    "United States": [24, 50, -125, -66],
    Italy: [36, 47.5, 6.5, 19],
    Spain: [36, 44, -10, 4.5],
    Switzerland: [45.8, 47.9, 5.9, 10.5],
    Japan: [30, 46, 129, 146],
  }
  for (const place of loadCatalog().places) {
    const box = bounds[place.country]
    if (!box) continue
    const [south, north, west, east] = box
    assert.ok(place.lat >= south && place.lat <= north && place.lng >= west && place.lng <= east, `${place.name} sits outside ${place.country}`)
  }
})
