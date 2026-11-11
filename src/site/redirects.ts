/**
 * Old GitHub Pages URLs (main at 3ae9d97) to the new routes, all permanent (308).
 * Old org-level pages go to the project that carries their work now. Pages with no new equivalent go to /.
 */
export const OLD_SLUGS: Record<string, string> = {
  "intuit": "/work/intuit",
  "model-playground": "/work/model-playground",
  "lazarus-ai-pubsec-brand": "/work/lazarus-brand",
  "talent-management": "/work/talent-management",
  "novart": "/work/novart",
  "corelogic": "/work/corelogic",
  "nestle": "/work/nestle",
  "usm-hue-man": "/work/usm-hue-man",
  "whitelist": "/work/whitelist",
  "chatter-social": "/work/chatter",
  "jet-protocol": "/work/fixed-rate-fixed-term",
  "urvin-finance": "/work/the-terminal",
}

type Redirect = { source: string; destination: string; permanent: true; has?: { type: "query"; key: string; value: string }[] }

export function legacyRedirects(): Redirect[] {
  const rows: Redirect[] = []
  for (const [slug, destination] of Object.entries(OLD_SLUGS)) {
    rows.push({ source: `/${slug}`, destination, permanent: true })
    rows.push({ source: "/404.html", has: [{ type: "query", key: "p", value: slug }], destination, permanent: true })
  }
  // Everything about Tyler is answered in the conversation; the About page is gone.
  rows.push({ source: "/about", destination: "/chat", permanent: true })
  // Brand projects folded into their parents.
  rows.push({ source: "/work/jet-brand", destination: "/work/fixed-rate-fixed-term", permanent: true })
  rows.push({ source: "/work/chatter-brand", destination: "/work/chatter", permanent: true })
  // /assets is not redirected: the images live there, at the same paths the old site used.
  for (const source of ["/index.html", "/404.html", "/README.md", "/CNAME", "/data/:path*"]) {
    rows.push({ source, destination: "/", permanent: true })
  }
  return rows
}
