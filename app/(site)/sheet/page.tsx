import Link from "next/link"
import { SectionAnchor } from "@/src/components/section-anchor"
import { PillSlot } from "@/src/components/pills"
import { followUpsFor, sheetAnswer } from "@/src/content/answers"
import { publishCatalog } from "@/src/content/publish"
import type { Intent } from "@/src/router/types"

const TOPICS = new Set(["location", "about", "process", "availability", "off_topic", "decline"])

export default async function SheetPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams
  const key = topic && TOPICS.has(topic) ? topic : "off_topic"
  const catalog = publishCatalog()
  const copy = sheetAnswer(key, catalog)
  const pills = followUpsFor(key as Intent, [], catalog)
  return (
    <section className="tlw sheet">
      <SectionAnchor />
      <PillSlot pills={pills} />
      <article className="study">
        <h1>{copy.title}</h1>
        <p id="answer">{copy.body}</p>
        <p className="meta">{copy.facts.join(" · ")}</p>
        <div className="follow">
          {pills.map((pill) => (
            <Link key={pill.href + pill.label} href={pill.href}>{pill.label}</Link>
          ))}
        </div>
        <p className="cta"><Link href={copy.cta.href}>{copy.cta.label}</Link></p>
      </article>
    </section>
  )
}
