"use client"

import { useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import type { PortalSpec } from "@/src/content/demos"
import type { PortalOverview, PortalSections, PortalTile } from "@/src/content/portals"

/**
 * A body of work as a way in: tiles to pick from, each opening its own page in the same plate, with
 * a way back out to the tiles. Escape and the back button both step out a layer; the gallery's own
 * close is still a layer above that.
 */
export function MediaPortal({ portal, sections }: { portal: PortalSpec; sections: PortalSections }) {
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState(sections[0].id)
  // The wait for the media to arrive applies to the first tiles only: once the visitor has picked a
  // tab or a tile, whatever shows next comes in at once.
  const [settled, setSettled] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  const plate = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const opener = useRef<string | null>(null)

  // Only tiles that are shown can be opened, or reached with Previous and Next.
  const all = sections.filter((section) => !section.overview).flatMap((section) => section.tiles.map((tile) => ({ tile, section })))
  const at = all.findIndex(({ tile }) => tile.slug === open)
  const current = at >= 0 ? all[at] : null
  const shown = sections.find((section) => section.id === filter) ?? sections[0]

  /** Moves between layers; where the browser can, the tile's picture carries across into the page. */
  const go = (slug: string | null) => {
    setSettled(true)
    const apply = () => {
      if (slug) opener.current = slug
      setOpen(slug)
      if (slug) setFilter(all.find(({ tile }) => tile.slug === slug)?.section.id ?? filter)
    }
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    const doc = document as Document & { startViewTransition?: (update: () => void) => unknown }
    if (!reduce && doc.startViewTransition) doc.startViewTransition(() => flushSync(apply))
    else apply()
  }

  // Each layer starts at its top; the page's title takes focus, and going back returns it to the tile.
  useEffect(() => {
    body.current?.scrollTo({ top: 0 })
    if (open) heading.current?.focus({ preventScroll: true })
    else if (opener.current) body.current?.querySelector<HTMLElement>(`[data-tile="${opener.current}"]`)?.focus({ preventScroll: true })
  }, [open])

  // An open Lab or Feature is its own moment: the gallery holds on this plate, so the plates after it
  // (the Memory reel) cannot be scrolled or stepped to until the visitor goes back.
  useEffect(() => {
    const scroller = plate.current?.closest<HTMLElement>(".gallery-scroll")
    if (!scroller || !plate.current || !open) return
    scroller.scrollTop += plate.current.getBoundingClientRect().top - scroller.getBoundingClientRect().top
    scroller.classList.add("held")
    return () => scroller.classList.remove("held")
  }, [open])

  // Escape steps out of a page before it can close the gallery.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.stopImmediatePropagation()
      go(null)
    }
    window.addEventListener("keydown", onKey, { capture: true })
    return () => window.removeEventListener("keydown", onKey, { capture: true })
    // go only reads state that the effect re-runs on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <section ref={plate} className={settled ? "frame media-portal settled" : "frame media-portal"} aria-label={portal.title}>
      <div className="portal-body" ref={body}>
        {current ? (
          <TilePage
            key={current.tile.slug}
            tile={current.tile}
            trail={[portal.title, current.section.name]}
            heading={heading}
            onBack={() => go(null)}
            prev={at > 0 ? all[at - 1].tile : null}
            next={at < all.length - 1 ? all[at + 1].tile : null}
            onGo={go}
          />
        ) : (
          <>
            <header className="story-head">
              {portal.kicker ? <p className="chapter-kicker">{portal.kicker}</p> : null}
              <h3>{portal.title}</h3>
              {portal.intro ? <p className="story-change">{portal.intro}</p> : null}
            </header>
            <div className="portal-tabs" role="tablist" aria-label="Sections">
              {sections.map((section) => (
                <button key={section.id} type="button" role="tab" aria-selected={section.id === shown.id} onClick={() => {
                  setSettled(true)
                  setFilter(section.id)
                }}>
                  {section.name}
                  {section.overview ? null : <small>{section.tiles.length}</small>}
                </button>
              ))}
            </div>
            <div role="tabpanel" aria-label={shown.heading} className={shown.overview || shown.tiles.every((tile) => tile.study) ? "portal-panel" : "portal-panel is-tiles"}>
            {shown.overview ? <Overview overview={shown.overview} /> : null}
            {/* A section told by its overview shows no tiles: the overview is the whole of it. */}
            {shown.overview ? null : shown.tiles.every((tile) => tile.study) ? (
              <LabCards key={shown.id} tiles={shown.tiles} onOpen={go} />
            ) : (
              <TileGrid key={shown.id} tiles={shown.tiles} onOpen={go} />
            )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

/**
 * A random order to bring a set in by: each item's place in the sequence. Chosen in the browser, so
 * the server's page and the first render agree; null until then, while the items wait hidden.
 */
function useRandomOrder(count: number): number[] | null {
  const [order, setOrder] = useState<number[] | null>(null)
  useEffect(() => {
    const picks = Array.from({ length: count }, (_, i) => i)
    for (let i = picks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[picks[i], picks[j]] = [picks[j], picks[i]]
    }
    const slot = new Array<number>(count)
    picks.forEach((item, k) => (slot[item] = k))
    setOrder(slot)
  }, [count])
  return order
}

/**
 * The Labs studies as cards: the test's name, its question large, and the prototype's loop under it.
 * Two to a row, then one across the whole width, and again; studies with no footage yet are cards of
 * words. Opening one opens the study.
 */
function LabCards({ tiles, onOpen }: { tiles: PortalTile[]; onOpen: (slug: string) => void }) {
  const filmed = tiles.filter((tile) => tile.video)
  const unfilmed = tiles.filter((tile) => !tile.video)
  const ordered = [...filmed, ...unfilmed]
  const order = useRandomOrder(ordered.length)
  return (
    <ul className={order ? "lab-grid portal-grid-in is-in" : "lab-grid portal-grid-in"}>
      {ordered.map((tile, i) => {
        const wide = !!tile.video && i % 3 === 2
        return (
          <li key={tile.slug} className={wide ? "lab is-wide" : "lab"} style={order ? ({ "--k": order[i] } as React.CSSProperties) : undefined}>
            <button type="button" className="lab-card" data-tile={tile.slug} onClick={() => onOpen(tile.slug)}>
              <span className="lab-head">
                <span className="lab-k">{tile.title}</span>
                <b>{tile.study?.question ?? tile.oneLiner}</b>
              </span>
              {tile.video ? (
                <span className="lab-media" style={{ viewTransitionName: `portal-${tile.slug}` } as React.CSSProperties}>
                  <video src={tile.video.card} poster={tile.video.poster} muted loop autoPlay playsInline preload="metadata" aria-hidden="true" />
                </span>
              ) : (
                <span className="lab-note">{tile.study?.testing ?? tile.description}</span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The tiles, filling the panel's height: as many columns as the width allows, rows stretched to share
 * the height, each tile's picture taking what its row leaves. The plate stays one panel tall, so the
 * next plate is one scroll away. A panel too short even for small tiles scrolls inside instead.
 */
function TileGrid({ tiles, onOpen }: { tiles: PortalTile[]; onOpen: (slug: string) => void }) {
  const order = useRandomOrder(tiles.length)
  return (
    <ul className={order ? "portal-grid portal-grid-in is-in" : "portal-grid portal-grid-in"}>
      {tiles.map((tile, i) => (
        <li key={tile.slug} style={order ? ({ "--k": order[i] } as React.CSSProperties) : undefined}>
          <button type="button" className="portal-tile" data-tile={tile.slug} onClick={() => onOpen(tile.slug)}>
            <TilePicture tile={tile} small />
            <span className="portal-tile-text">
              <b>{tile.title}</b>
              <span>{tile.oneLiner}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** How the work is built, layer by layer: each with its size, a line, and a few of its parts. */
function Overview({ overview }: { overview: PortalOverview }) {
  return (
    <section className="portal-overview" aria-label="How it is built">
      <p className="portal-overview-intro">{overview.intro}</p>
      <ol className="layers">
        {overview.layers.map((layer, i) => (
          <li key={layer.name} className="layer" style={{ "--i": i } as React.CSSProperties}>
            <div className="layer-head">
              <span className="layer-n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <b>{layer.name}</b>
              <span className="layer-count">{layer.count} {layer.unit}</span>
            </div>
            <p className="layer-note">{layer.note}</p>
            <ul className="layer-parts" aria-label={`Some of the ${layer.name.toLowerCase()}`}>
              {layer.examples.map((part) => <li key={part}>{part}</li>)}
            </ul>
          </li>
        ))}
      </ol>
      <p className="portal-overview-note">{overview.note}</p>
    </section>
  )
}

/** The tile's picture: its screen, or the study's footage, or its number where there is neither. */
function TilePicture({ tile, small = false }: { tile: PortalTile; small?: boolean }) {
  const name = { viewTransitionName: `portal-${tile.slug}` } as React.CSSProperties
  if (tile.video) {
    return small ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="portal-pic" style={name} src={tile.video.poster} alt="" loading="lazy" />
    ) : (
      <video className="portal-pic" style={name} src={tile.video.full} poster={tile.video.poster} controls muted loop playsInline preload="metadata" />
    )
  }
  if (tile.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="portal-pic" style={name} src={tile.image} alt={small ? "" : `${tile.title}: the design`} loading="lazy" />
  }
  return (
    <span className="portal-pic portal-pic-empty" style={name} aria-hidden="true">
      {tile.study ? tile.study.number : tile.title.slice(0, 1)}
    </span>
  )
}

function TilePage({ tile, trail, heading, onBack, prev, next, onGo }: {
  tile: PortalTile
  trail: string[]
  heading: React.RefObject<HTMLHeadingElement | null>
  onBack: () => void
  prev: PortalTile | null
  next: PortalTile | null
  onGo: (slug: string) => void
}) {
  const study = tile.study
  return (
    <article className="portal-page">
      <nav className="portal-trail" aria-label="Back out">
        <button type="button" className="portal-back" onClick={onBack}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M7.5 2.5L4 6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {trail[0]}
        </button>
        <span aria-hidden="true">/</span>
        <span>{trail[1]}</span>
      </nav>
      <TilePicture tile={tile} />
      <header className="portal-page-head">
        <p className="chapter-kicker">{study ? `Study ${study.number} · ${study.category}` : `${tile.platform} · ${tile.status}`}</p>
        <h3 ref={heading} tabIndex={-1}>{study ? study.question : tile.title}</h3>
        <p className="portal-lede">{study ? study.testing : tile.description}</p>
      </header>
      {study ? (
        <div className="portal-study">
          {study.method || study.participants ? (
            <dl className="portal-facts">
              {study.method ? <><dt>Method</dt><dd>{study.method}</dd></> : null}
              {study.participants ? <><dt>With</dt><dd>{study.participants}</dd></> : null}
              <dt>Status</dt><dd>{tile.status}</dd>
            </dl>
          ) : null}
          <h4>Hypothesis</h4>
          <p>{study.hypothesis}</p>
          <h4>Why it matters</h4>
          <p>{study.why}</p>
          {study.prototype?.length ? (
            <>
              <h4>The prototype</h4>
              <ol>{study.prototype.map((step) => <li key={step}>{step}</li>)}</ol>
            </>
          ) : null}
          <h4>How it runs</h4>
          <ol>{study.run.map((step) => <li key={step.lead}><b>{step.lead}</b> {step.detail}</li>)}</ol>
          {study.receipts?.length ? (
            <>
              <h4>From research</h4>
              {study.receipts.map((receipt) => (
                <blockquote key={receipt.quote}>
                  <p>{receipt.quote}</p>
                  <cite>{receipt.attribution}</cite>
                </blockquote>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
      <footer className="portal-pager">
        {prev ? <button type="button" onClick={() => onGo(prev.slug)}><small>Previous</small>{prev.title}</button> : <span />}
        {next ? <button type="button" className="is-next" onClick={() => onGo(next.slug)}><small>Next</small>{next.title}</button> : <span />}
      </footer>
    </article>
  )
}
