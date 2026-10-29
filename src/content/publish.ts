import "server-only"
import { clientLabel, employerPublicName } from "./employer"
import { textIssues } from "./guard"
import { loadCatalog } from "./catalog"
import type { Catalog, Client, Project, Role, Theme } from "./schema"

export type PublicCatalog = {
  profile: Catalog["profile"]
  places: Catalog["places"]
  themes: Theme[]
  roles: Role[]
  clients: Client[]
  projects: Project[]
  relations: Catalog["relations"]
  employer: string
}

let cached: PublicCatalog | null = null

export function publishCatalog(): PublicCatalog {
  if (cached && cached.employer === employerPublicName()) return cached
  const catalog = loadCatalog()
  const hidden = new Set(catalog.projects.filter((project) => project.flagged).map((project) => project.id))
  const projects = catalog.projects.filter((project) => !project.flagged)
  const clients = catalog.clients
    .map((client) => ({
      ...client,
      name: clientLabel(client),
      usesEmployerName: false,
      projectIds: client.projectIds.filter((id) => !hidden.has(id)),
    }))
    .filter((client) => client.projectIds.length > 0)
  const roles = catalog.roles
    .filter((role) => role.listed)
    .map((role) => ({
      ...role,
      name: role.employer ? employerPublicName() : role.name,
      clientIds: role.clientIds.filter((id) => clients.some((client) => client.id === id)),
    }))
  const ids = new Set<string>([
    catalog.profile.id,
    ...catalog.places.map((place) => place.id),
    ...catalog.themes.map((theme) => theme.id),
    ...roles.map((role) => role.id),
    ...clients.map((client) => client.id),
    ...projects.map((project) => project.id),
  ])
  const relations = catalog.relations.filter((relation) => ids.has(relation.from) && ids.has(relation.to))
  const published: PublicCatalog = {
    profile: catalog.profile,
    places: catalog.places,
    themes: catalog.themes,
    roles,
    clients,
    projects,
    relations,
    employer: employerPublicName(),
  }
  const issues = textIssues(JSON.stringify(published))
  if (issues.length) throw new Error(`public catalog failed checks: ${issues.join(", ")}`)
  cached = published
  return published
}

export function publicFocusIds(catalog = publishCatalog()): [string, ...string[]] {
  const ids = [
    catalog.profile.id,
    ...catalog.places.map((place) => place.id),
    ...catalog.themes.map((theme) => theme.id),
    ...catalog.roles.map((role) => role.id),
    ...catalog.clients.map((client) => client.id),
    ...catalog.projects.map((project) => project.id),
  ]
  return ids as [string, ...string[]]
}
