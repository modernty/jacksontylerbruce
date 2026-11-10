import type { MetadataRoute } from "next"
import { indexable, siteUrl } from "@/src/site/seo"

export const dynamic = "force-dynamic"

export default function robots(): MetadataRoute.Robots {
  if (!indexable()) return { rules: { userAgent: "*", disallow: "/" } }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/me"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  }
}
