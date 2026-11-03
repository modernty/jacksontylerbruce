import { readFileSync } from "node:fs"
import type { MetadataRoute } from "next"

function host(): string {
  return readFileSync("CNAME", "utf8").trim()
}

export default function robots(): MetadataRoute.Robots {
  const name = host()
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/me", "/me/", "/me/checklist"],
    },
    sitemap: `https://${name}/sitemap.xml`,
    host: `https://${name}`,
  }
}
