import Link from "next/link"
import { notFound } from "next/navigation"
import { SectionAnchor } from "@/src/components/section-anchor"
import { publishCatalog } from "@/src/content/publish"

export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const catalog = publishCatalog()
  const project = catalog.projects.find((item) => item.slug === slug)
  if (!project) notFound()
  const role = catalog.roles.find((item) => item.id === project.roleId)
  const client = catalog.clients.find((item) => item.id === project.clientId)
  const themes = project.themeIds
    .map((id) => catalog.themes.find((theme) => theme.id === id)?.name)
    .filter(Boolean)
    .join(" · ")
  const org = project.orgLabel ?? client?.name ?? ""
  return (
    <section className="tlw">
      <SectionAnchor />
      <article className="study">
        <h1>{project.name}</h1>
        <p className="meta">{[org, role?.title, role?.yearLabel].filter(Boolean).join(" · ")}</p>
        <p className="themes">{themes}</p>
        {project.sections.map((section) => (
          <section key={section.id}>
            <h2 id={section.id}>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
        <p className="cta"><Link href="/timeline">Back to the timeline →</Link></p>
      </article>
    </section>
  )
}
