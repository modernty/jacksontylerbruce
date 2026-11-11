/**
 * A stand-in cover for projects that have no image yet: deep ink falling off to pale blue, with
 * heavy grain. Seeded by the project slug, so each project gets its own angle and falloff and
 * keeps it every time.
 */

function seeded(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  let state = h >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Where the light comes from and how far the ink reaches, per project. */
export function grainLayout(slug: string) {
  const random = seeded(slug)
  return {
    // Dark on the left, light on the right, tilted a little differently per project.
    angle: -12 + random() * 24,
    mid: 0.5 + random() * 0.1,
    seed: Math.floor(random() * 1000),
  }
}

export function Grain({ slug, label, className }: { slug: string; label: string; className?: string }) {
  const { angle, mid, seed } = grainLayout(slug)
  const id = `grain-${slug.replace(/[^a-z0-9-]/g, "")}`
  return (
    <svg className={className ? `grain ${className}` : "grain"} viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${label}, placeholder image`}>
      <defs>
        <linearGradient id={`${id}-fall`} x1="0" y1="0.5" x2="1" y2="0.5" gradientTransform={`rotate(${angle.toFixed(1)} 0.5 0.5)`}>
          <stop offset="0" className="g-deep" />
          <stop offset={(mid * 0.5).toFixed(3)} className="g-ink" />
          <stop offset={mid.toFixed(3)} className="g-mid" />
          <stop offset={(mid + 0.3).toFixed(3)} className="g-light" />
          <stop offset="1" className="g-pale" />
        </linearGradient>
        <filter id={`${id}-noise`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves="1" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          {/* Push the noise to hard light and dark specks, like film grain. */}
          <feComponentTransfer>
            <feFuncR type="linear" slope="3.2" intercept="-1.1" />
            <feFuncG type="linear" slope="3.2" intercept="-1.1" />
            <feFuncB type="linear" slope="3.2" intercept="-1.1" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="160" height="100" fill={`url(#${id}-fall)`} />
      <rect width="160" height="100" filter={`url(#${id}-noise)`} className="g-noise" />
    </svg>
  )
}
