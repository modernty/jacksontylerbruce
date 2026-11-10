import type { MetadataRoute } from "next"
import { publishCatalog } from "@/src/content/publish"

const SITE = "https://jacksontylerbruce.com"

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/timeline", "/timeline/projects", "/about", ...publishCatalog().projects.map((project) => `/work/${project.slug}`)]
  return pages.map((path) => ({ url: `${SITE}${path}` }))
}
