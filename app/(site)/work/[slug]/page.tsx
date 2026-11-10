import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { TrackOnMount } from "@/src/components/analytics"
import { SectionAnchor } from "@/src/components/section-anchor"
import { WorkView } from "@/src/components/work-view"
import { publishCatalog } from "@/src/content/publish"
import type { Section } from "@/src/content/schema"
import { Grain } from "@/src/plates/grain"
import { MediaFrame } from "@/src/plates/media-frame"

function find(slug: string) {
  const catalog = publishCatalog()
  const project = catalog.projects.find((item) => item.slug === slug)
  return project ? { catalog, project } : null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const found = find((await params).slug)
  if (!found) return {}
  const { project } = found
  return {
    title: `${project.name} — Tyler Jackson`,
    description: project.summary,
    openGraph: project.media.coverInk ? { images: [{ url: project.media.coverInk, width: 1600, height: 1000 }] } : undefined,
  }
}

function Body({ section }: { section: Section }) {
  return (
    <>
      {section.body.split("\n\n").filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {section.items.length ? (
        <ul className="items">
          {section.items.map((item) => (
            <li key={item.label}>
              {item.href ? <a href={item.href} target="_blank" rel="noreferrer">{item.label} ↗</a> : <span>{item.label}</span>}
              {item.note ? <span className="item-note">{item.note}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}

/**
 * The base state is a prompt to talk: the title, where the work lives, and one lead paragraph.
 * Everything else waits behind "more info", in the same column the conversation will use.
 * Boring view lays the same pieces out as info beside photos, with no conversation.
 */
export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const found = find((await params).slug)
  if (!found) notFound()
  const { catalog, project } = found
  const role = catalog.roles.find((item) => item.id === project.roleId)
  const client = catalog.clients.find((item) => item.id === project.clientId)
  const themes = project.themeIds
    .map((id) => catalog.themes.find((theme) => theme.id === id)?.name)
    .filter(Boolean)
    .join(" · ")
  const org = project.orgLabel ?? client?.name ?? ""

  const byId = new Map(project.sections.map((section) => [section.id, section]))
  const summary = byId.get("summary")
  const context = byId.get("context")
  const lead = context ?? summary
  const external = byId.get("links")?.items ?? []
  const rest = project.sections.filter((section) => section !== lead && section.id !== "links" && section.id !== "summary")
  const images = [project.media.cover, ...project.media.images].filter((image) => image !== null)
  const leadIds = [lead?.id ?? "summary", ...(summary && lead !== summary ? ["summary"] : [])]

  return (
    <main className="work">
      <SectionAnchor />
      <TrackOnMount name="project_opened" props={{ slug: project.slug }} />
      <WorkView
        slug={project.slug}
        head={
          <header className="column-head">
            <h1>{project.name}</h1>
            {external.length ? (
              <p className="links">
                {external.map((item) => (
                  <a key={item.href} href={item.href} target="_blank" rel="noreferrer">{item.label}</a>
                ))}
              </p>
            ) : null}
          </header>
        }
        leadIds={leadIds}
        lead={lead ? lead.body.split("\n\n").filter(Boolean) : []}
        meta={
          <div className="facts">
            <p className="meta">{[org, role?.title, role?.yearLabel].filter(Boolean).join(" · ")}</p>
            <p className="themes">{themes}</p>
          </div>
        }
        sections={
          rest.length ? (
            <div className="accordions">
              {rest.map((section) => (
                <details key={section.id} id={section.id} suppressHydrationWarning>
                  <summary>{section.title}</summary>
                  <div className="panel">
                    <Body section={section} />
                  </div>
                </details>
              ))}
            </div>
          ) : null
        }
        media={
          images.length ? (
            <section className="media" aria-label={`${project.name} images`}>
              {images.map((image, index) => (
                <MediaFrame key={image.src} image={image} index={index} total={images.length} priority={index === 0} sizes="(max-width: 900px) 100vw, 60vw" />
              ))}
            </section>
          ) : (
            <section className="media" aria-label={`${project.name} image`}>
              <figure className="frame">
                <Grain slug={project.slug} label={project.name} />
              </figure>
            </section>
          )
        }
        hasImages={images.length > 0}
        names={Object.fromEntries(catalog.projects.map((item) => [item.slug, item.name]))}
        cta={<p className="cta"><Link href="/timeline">Back to the timeline →</Link></p>}
      />
    </main>
  )
}
