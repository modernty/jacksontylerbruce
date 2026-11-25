"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

/** A project image that resolves out of a blur as it loads. No placeholder: the frame stays quiet until it arrives. */
export function LoadingImage({
  src,
  alt,
  width,
  height,
  sizes,
  priority = false,
}: {
  src: string
  alt: string
  width: number
  height: number
  sizes: string
  priority?: boolean
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
        // Animated covers (GIF, animated WebP) are served as they are, so they keep playing.
        unoptimized={/\.(gif|webp)$/.test(src)}
        data-loaded={loaded ? "" : undefined}
        className="resolving"
        onLoad={() => setLoaded(true)}
      />
    </>
  )
}
