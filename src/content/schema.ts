import { z } from "zod"

export const TITLES = [
  "Designer",
  "Design Director",
  "Lead Designer",
  "Design Lead",
  "Senior Designer",
] as const

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

export const SectionSchema = z.object({
  id: slug,
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
})

export const ThemeSchema = z.object({
  id: z.string().regex(/^theme:[a-z0-9-]+$/),
  key: z.string().min(1),
  slug: slug,
  label: z.string().min(1),
  name: z.string().min(1),
})

export const PlaceSchema = z.object({
  id: z.string().regex(/^place:[a-z0-9-]+$/),
  name: z.string().min(1),
  kind: z.enum(["lived", "traveled", "client"]),
})

export const ProfileSchema = z.object({
  id: z.literal("profile:tyler"),
  name: z.string().min(1),
  title: z.enum(TITLES),
  location: z.literal("Miami, FL"),
  placeId: z.string(),
})

export const RoleSchema = z.object({
  id: z.string().regex(/^role:[a-z0-9-]+$/),
  name: z.string(),
  employer: z.boolean(),
  listed: z.boolean(),
  title: z.enum(TITLES),
  start: z.number(),
  end: z.number().nullable(),
  yearLabel: z.string().min(1),
  since: z.string().optional(),
  lane: z.number().int().min(0).max(2),
  clientIds: z.array(z.string()).min(1),
  aliases: z.array(z.string()),
}).superRefine((role, ctx) => {
  if (role.employer && role.name !== "") {
    ctx.addIssue({ code: "custom", message: "employer role name is resolved by the switch" })
  }
  if (!role.employer && role.name.trim() === "") {
    ctx.addIssue({ code: "custom", message: "role needs a name" })
  }
})

export const ClientSchema = z.object({
  id: z.string().regex(/^client:[a-z0-9-]+$/),
  name: z.string(),
  /** When set, the visible name is the employer switch, not a second literal. */
  usesEmployerName: z.boolean().default(false),
  roleId: z.string(),
  projectIds: z.array(z.string()).min(1),
}).superRefine((client, ctx) => {
  if (client.usesEmployerName && client.name !== "") {
    ctx.addIssue({ code: "custom", message: "employer client name is resolved by the switch" })
  }
  if (!client.usesEmployerName && client.name.trim() === "") {
    ctx.addIssue({ code: "custom", message: "client needs a name" })
  }
})

export const ProjectSchema = z.object({
  id: z.string().regex(/^project:[a-z0-9-]+$/),
  slug: slug,
  name: z.string().min(1),
  summary: z.string().min(1),
  sections: z.array(SectionSchema).min(1),
  start: z.number(),
  end: z.number().nullable(),
  roleId: z.string(),
  clientId: z.string(),
  lane: z.number().int().min(0).max(2),
  themeIds: z.array(z.string()).min(1),
  onTimeline: z.boolean(),
  flagged: z.boolean(),
  orgLabel: z.string().optional(),
  aliases: z.array(z.string()),
}).superRefine((project, ctx) => {
  const seen = new Set<string>()
  for (const section of project.sections) {
    if (seen.has(section.id)) ctx.addIssue({ code: "custom", message: `duplicate section ${section.id}` })
    seen.add(section.id)
  }
})

export const RelationSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  kind: z.enum(["located", "during", "tagged", "includes", "for"]),
})

export const CatalogSchema = z.object({
  profile: ProfileSchema,
  places: z.array(PlaceSchema).min(1),
  themes: z.array(ThemeSchema).length(8),
  roles: z.array(RoleSchema).min(1),
  clients: z.array(ClientSchema).min(1),
  projects: z.array(ProjectSchema).min(1),
  relations: z.array(RelationSchema),
}).superRefine((catalog, ctx) => {
  const ids = new Set<string>([
    catalog.profile.id,
    ...catalog.places.map((item) => item.id),
    ...catalog.themes.map((item) => item.id),
    ...catalog.roles.map((item) => item.id),
    ...catalog.clients.map((item) => item.id),
    ...catalog.projects.map((item) => item.id),
  ])
  const expected = 1 + catalog.places.length + catalog.themes.length + catalog.roles.length + catalog.clients.length + catalog.projects.length
  if (ids.size !== expected) {
    ctx.addIssue({ code: "custom", message: "duplicate content ids" })
  }
  for (const relation of catalog.relations) {
    if (!ids.has(relation.from) || !ids.has(relation.to)) {
      ctx.addIssue({ code: "custom", message: `dangling relation ${relation.id}` })
    }
  }
  for (const role of catalog.roles) {
    const linked = catalog.clients.filter((client) => client.roleId === role.id).map((client) => client.id)
    if (linked.join("|") !== role.clientIds.join("|")) {
      ctx.addIssue({ code: "custom", message: `${role.id} client ids do not match` })
    }
  }
  for (const client of catalog.clients) {
    if (!catalog.roles.some((role) => role.id === client.roleId)) {
      ctx.addIssue({ code: "custom", message: `${client.id} missing role` })
    }
    const linked = catalog.projects.filter((project) => project.clientId === client.id).map((project) => project.id)
    if (linked.join("|") !== client.projectIds.join("|")) {
      ctx.addIssue({ code: "custom", message: `${client.id} project ids do not match` })
    }
  }
  for (const project of catalog.projects) {
    const client = catalog.clients.find((item) => item.id === project.clientId)
    if (!client) ctx.addIssue({ code: "custom", message: `${project.id} missing client` })
    else if (client.roleId !== project.roleId) ctx.addIssue({ code: "custom", message: `${project.id} role and client disagree` })
    for (const themeId of project.themeIds) {
      if (!catalog.themes.some((theme) => theme.id === themeId)) {
        ctx.addIssue({ code: "custom", message: `${project.id} missing theme ${themeId}` })
      }
    }
  }
  if (!catalog.places.some((place) => place.id === catalog.profile.placeId)) {
    ctx.addIssue({ code: "custom", message: "profile place is missing" })
  }
})

export type Catalog = z.infer<typeof CatalogSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Role = z.infer<typeof RoleSchema>
export type Client = z.infer<typeof ClientSchema>
export type Theme = z.infer<typeof ThemeSchema>
export type Section = z.infer<typeof SectionSchema>
