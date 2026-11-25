import type { StudySpec } from "@/src/content/demos"
import { StoryTrack } from "./story-track"
import { TrustDiagram } from "./trust-diagram"

/**
 * A study's chapters as media, in order: each stacked as heading, then the screen (a story that plays,
 * a diagram, or an image), then what the chapter says.
 */
export function MediaStudy({ study }: { study: StudySpec }) {
  return (
    <>
      {study.chapters.map((chapter) =>
        chapter.diagram ? (
          <section key={chapter.id} id={`media-${chapter.id}`} className="frame media-chapter media-story">
            <TrustDiagram when={chapter.kicker} title={chapter.title} change={chapter.change} diagram={chapter.diagram} />
          </section>
        ) : chapter.story ? (
          <section key={chapter.id} id={`media-${chapter.id}`} className="frame media-chapter media-story">
            <StoryTrack when={chapter.kicker} title={chapter.title} change={chapter.change} story={chapter.story} />
          </section>
        ) : (
          <section key={chapter.id} id={`media-${chapter.id}`} className="frame media-chapter">
            <header className="story-head">
              <p className="chapter-kicker">{chapter.kicker}</p>
              <h3>{chapter.title}</h3>
            </header>
            {chapter.image ? (
              <figure className={`chapter-figure ${chapter.image.frame}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={chapter.image.src} alt={chapter.image.alt} loading="lazy" />
              </figure>
            ) : null}
            {chapter.body.length ? (
              <div className="chapter-body">
                {chapter.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            ) : null}
          </section>
        ),
      )}
    </>
  )
}
