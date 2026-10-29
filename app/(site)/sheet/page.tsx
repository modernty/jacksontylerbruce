import Link from "next/link"
import { followUpsFor, sheetCopy } from "@/src/router/pills"
import { PillSlot } from "@/src/components/pills"

const TOPICS = new Set(["location", "about", "process", "availability", "off_topic", "decline"])

export default async function SheetPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams
  const key = topic && TOPICS.has(topic) ? topic : "off_topic"
  const copy = sheetCopy(key)
  const pills = followUpsFor(key === "off_topic" ? "off_topic" : key as "location")
  return (
    <section className="tlw sheet">
      <PillSlot pills={pills} />
      <article className="study">
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
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
