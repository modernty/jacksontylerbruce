// Writes src/globe/borders.gen.json: country borders and coastlines as lines of [lng, lat],
// each shared border once, rounded to 0.1 degree. The globe draws them faintly.
import { readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { mesh } from "topojson-client"

const require = createRequire(import.meta.url)
const topology = JSON.parse(readFileSync(require.resolve("world-atlas/countries-110m.json"), "utf8"))
const lines = mesh(topology, topology.objects.countries).coordinates
  .map((line) => {
    const out = []
    for (const [lng, lat] of line) {
      const point = [Math.round(lng * 10) / 10, Math.round(lat * 10) / 10]
      const last = out[out.length - 1]
      if (!last || last[0] !== point[0] || last[1] !== point[1]) out.push(point)
    }
    return out
  })
  .filter((line) => line.length > 1)

const target = new URL("../src/globe/borders.gen.json", import.meta.url)
writeFileSync(target, `${JSON.stringify(lines)}\n`)
console.log(`Wrote ${lines.length} lines, ${lines.reduce((sum, line) => sum + line.length, 0)} points.`)
