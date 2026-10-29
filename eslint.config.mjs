import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { FlatCompat } from "@eslint/eslintrc"

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

const config = [
  { ignores: ["ask/**", ".next/**", "node_modules/**", "work/**", "design/**", "public/**", "system/**", "map.js", "pipeline/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
]

export default config
