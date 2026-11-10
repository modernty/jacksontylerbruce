import type { MetadataRoute } from "next"
import { indexable, publicPaths, siteUrl } from "@/src/site/seo"

export const dynamic = "force-dynamic"

export default function sitemap(): MetadataRoute.Sitemap {
  if (!indexable()) return []
  const base = siteUrl()
  return publicPaths().map((path) => ({ url: `${base}${path}` }))
}
