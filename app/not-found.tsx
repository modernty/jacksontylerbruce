import Link from "next/link"

export default function NotFound() {
  return (
    <section className="tlw">
      <article className="study">
        <h1>That page is not on the site.</h1>
        <p>The public timeline, focuses, and case studies are open.</p>
        <p className="cta"><Link href="/timeline">See the timeline →</Link></p>
      </article>
    </section>
  )
}
