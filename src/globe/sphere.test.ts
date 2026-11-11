import assert from "node:assert/strict"
import { test } from "node:test"
import borders from "./borders.gen.json"
import { distance, greatCircle, project, splitPath } from "./sphere"

test("the view centre projects to the middle and its antipode to the back", () => {
  const view = { lng: -80, lat: 25 }
  assert.deepEqual(project(25, -80, view, 100, 500, 300), { x: 500, y: 300, front: true })
  assert.equal(project(-25, 100, view, 100, 500, 300).front, false)
})

test("great circles end where they should and split at the rim", () => {
  const path = greatCircle({ lat: 25.76, lng: -80.19 }, { lat: 35.68, lng: 139.65 })
  assert.ok(Math.abs(path[path.length - 1].lat - 35.68) < 1e-6)
  assert.ok(Math.abs(distance({ lat: 0, lng: 0 }, { lat: 0, lng: 90 }) - 90) < 1e-9)
  const halves = splitPath(path.map((point) => project(point.lat, point.lng, { lng: -80, lat: 25 }, 100, 0, 0)))
  assert.ok(halves.front.startsWith("M") && halves.back.startsWith("M"))
})

test("border lines are generated and compact", () => {
  const lines = borders as [number, number][][]
  assert.ok(lines.length > 200)
  for (const line of lines) for (const [lng, lat] of line) assert.ok(Math.abs(lng) <= 180 && Math.abs(lat) <= 90)
})
