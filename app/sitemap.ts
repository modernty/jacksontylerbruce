import { readFileSync } from "node:fs"
import type { MetadataRoute } from "next"
import { publishCatalog } from "@/src/content/publish"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = `https://${readFileSync("CNAME", "utf8").trim()}`
  const catalog = publishCatalog()
  const paths = [
    "/",
    "/timeline",
    "/timeline/projects",
    "/sheet",
    ...catalog.themes.map((theme) => `/focus/${theme.slug}`),
    ...catalog.projects.map((project) => `/work/${project.slug}`),
  ]
  return paths
    .filter((path) => !path.startsWith("/me"))
    .map((path) => ({ url: new URL(path, base).href }))
}
