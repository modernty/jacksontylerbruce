/**
 * Old GitHub Pages URLs (main at 3ae9d97) to the new routes, all permanent (308).
 * Old org-level pages whose work is now partly hidden (chatter-social, jet-protocol, urvin-finance)
 * and pages with no new equivalent go to /.
 */
export const OLD_SLUGS: Record<string, string> = {
  "intuit": "/work/intuit",
  "model-playground": "/work/model-playground",
  "lazarus-ai-pubsec-brand": "/work/lazarus-brand",
  "talent-management": "/work/atls",
  "novart": "/work/novart",
  "corelogic": "/work/corelogic",
  "nestle": "/work/nestle",
  "usm-hue-man": "/work/usm-hue-man",
  "whitelist": "/",
  "chatter-social": "/",
  "jet-protocol": "/",
  "urvin-finance": "/",
}

type Redirect = { source: string; destination: string; permanent: true; has?: { type: "query"; key: string; value: string }[] }

export function legacyRedirects(): Redirect[] {
  const rows: Redirect[] = []
  for (const [slug, destination] of Object.entries(OLD_SLUGS)) {
    rows.push({ source: `/${slug}`, destination, permanent: true })
    rows.push({ source: "/404.html", has: [{ type: "query", key: "p", value: slug }], destination, permanent: true })
  }
  for (const source of ["/index.html", "/404.html", "/README.md", "/CNAME", "/data/:path*", "/assets/:path*"]) {
    rows.push({ source, destination: "/", permanent: true })
  }
  return rows
}
