"use client"

import { Globe } from "./globe"
import type { GlobePlace } from "./types"

/**
 * The globe, and the same places as plain text for screen readers. Sighted visitors hover the
 * markers or ask the chat; there is no visible list.
 */
export function Travel({ places, focusId = null }: { places: GlobePlace[]; focusId?: string | null }) {
  const lived = places.filter((place) => place.kind === "lived")
  const travelled = places.filter((place) => place.kind !== "lived")
  return (
    <div className="travel">
      <div className="viewer">
        <Globe places={places} focusId={focusId} />
      </div>
      <div className="sr">
        <h2 id="travel">Places</h2>
        <p>Lived: {lived.map((place) => place.name).join(", ")}.</p>
        <p>Travelled: {travelled.map((place) => `${place.name}, ${place.country}`).join("; ")}.</p>
      </div>
    </div>
  )
}
