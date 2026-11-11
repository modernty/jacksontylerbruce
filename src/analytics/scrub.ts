/** Query params that name a view, never visitor text. Everything else (notably `q`) is dropped. */
const SAFE_PARAMS = new Set(["topic", "role", "focus"])

export function scrubUrl(raw: string): string {
  const url = new URL(raw, "http://portfolio.local")
  for (const key of [...url.searchParams.keys()]) {
    if (!SAFE_PARAMS.has(key)) url.searchParams.delete(key)
  }
  const local = raw.startsWith("/")
  return local ? `${url.pathname}${url.search}${url.hash}` : url.toString()
}

/** The path a link points at, with no query or hash, for event properties. */
export function targetPath(href: string): string {
  return new URL(href, "http://portfolio.local").pathname
}
