import type { Project, Role } from "./schema"

/** A role's title as shown: one title, or a progression ("Product Design Lead, then Design Director"). */
export function roleTitle(role: Pick<Role, "title" | "titles">): string {
  return role.titles?.length ? role.titles.join(", then ") : role.title
}

/** The title on one project: its own when set, otherwise the role's. */
export function projectTitle(project: Pick<Project, "title">, role: Pick<Role, "title" | "titles"> | undefined): string {
  return project.title ?? (role ? roleTitle(role) : "")
}
