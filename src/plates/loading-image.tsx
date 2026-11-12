"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { ImageGeneration } from "@/src/components/assistant-ui/elements/image-generation"

/**
 * A project image that holds its place with the dot grid until it loads, then resolves out of a blur.
 * Renders the image and the grid side by side, so it drops into a figure without changing its layout.
 * "fill" lays the grid over the whole figure (the preview frame); "flow" over the image's own box
 * at the top of the figure, so a caption under it stays clear (the project page).
 */
export function LoadingImage({
  src,
  alt,
  width,
  height,
  sizes,
  priority = false,
  fit = "flow",
}: {
  src: string
  alt: string
  width: number
  height: number
  sizes: string
  priority?: boolean
  fit?: "fill" | "flow"
}) {
  const [loaded, setLoaded] = useState(false)
  const image = useRef<HTMLImageElement>(null)
  // An image already in the cache can finish before this hydrates and never fire onLoad.
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth > 0) setLoaded(true)
  }, [])
  return (
    <>
      <Image
        ref={image}
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        unoptimized={src.endsWith(".gif")}
        data-loaded={loaded ? "" : undefined}
        className="resolving"
        onLoad={() => setLoaded(true)}
      />
      <ImageGeneration generating={!loaded} ratio={width / height} className={`image-hold ${fit}`} style={fit === "flow" ? { aspectRatio: `${width} / ${height}` } : undefined} />
    </>
  )
}
