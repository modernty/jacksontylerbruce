import { publishCatalog } from "@/src/content/publish"

/** The name as the site writes it, everywhere: the header, page titles and share cards. */
export const SITE_NAME = "Jackson, Tyler Bruce"
export const HERO = "Designing the intimacy between people and machines."
const CANONICAL = "https://jacksontylerbruce.com"

type Env = Record<string, string | undefined>

/** Only the production build of the real site is indexable. Every preview and local build is noindex. */
export function indexable(env: Env = process.env): boolean {
  return env.VERCEL_ENV === "production"
}

export function siteUrl(env: Env = process.env): string {
  if (indexable(env)) return (env.SITE_URL || CANONICAL).replace(/\/$/, "")
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`
  return "http://localhost:3000"
}

/** Public, indexable paths. Hidden projects never reach publishCatalog, and /api and /me are not pages here. */
export function publicPaths(): string[] {
  const catalog = publishCatalog()
  return [
    "/timeline",
    "/timeline/projects",
    ...catalog.themes.map((theme) => `/focus/${theme.slug}`),
    ...catalog.projects.map((project) => `/work/${project.slug}`),
  ]
}
