import { LoadingImage } from "./loading-image"
import type { Image as MediaImage } from "@/src/content/schema"

/** One image on the page. Illustrations always say so, so they never read as shipped work. */
export function MediaFrame({
  image,
  index,
  total,
  priority = false,
  sizes = "(max-width: 600px) 100vw, 960px",
}: {
  image: MediaImage
  index?: number
  total?: number
  priority?: boolean
  sizes?: string
}) {
  const counter = index !== undefined && total ? `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}` : null
  return (
    <figure className="frame">
      <LoadingImage src={image.src} alt={image.alt} width={image.width} height={image.height} sizes={sizes} priority={priority} />
      {counter || image.kind === "illustration" ? (
        <figcaption>
          {counter ? <span>{counter}</span> : null}
          {image.kind === "illustration" ? <span>Illustration, not shipped work</span> : null}
        </figcaption>
      ) : null}
    </figure>
  )
}
