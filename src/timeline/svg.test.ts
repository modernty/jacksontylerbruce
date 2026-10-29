import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { test } from "node:test"
import { loadCatalog } from "@/src/content/catalog"
import { toTimelineModel } from "./model"
import { desktopSvg, mobileSvg } from "./svg"

test("the typescript timeline matches gen.py", () => {
  const raw = execFileSync("python3", ["-c", `
import importlib.util, json
spec = importlib.util.spec_from_file_location("design_gen", "design/source/gen.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
model = mod.build()
print(json.dumps({"desktop": mod.desktop(model), "mobile": mod.mobile(model)}))
`], { encoding: "utf8", maxBuffer: 8_000_000 })
  const expected = JSON.parse(raw) as { desktop: string; mobile: string }
  const model = toTimelineModel(loadCatalog(), { includeFlagged: true })
  assert.equal(desktopSvg(model), expected.desktop)
  assert.equal(mobileSvg(model), expected.mobile)
})
