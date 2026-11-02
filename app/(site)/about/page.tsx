import type { Metadata } from "next"
import { publishCatalog } from "@/src/content/publish"
import { AboutStage } from "@/src/components/about-stage"
import type { GlobePlace } from "@/src/globe/types"

export const metadata: Metadata = {
  title: "About — Tyler Jackson",
  description: "Where Tyler Jackson is based, and the places he has lived and travelled.",
}

export default function AboutPage() {
  const { profile, places } = publishCatalog()
  const globe: GlobePlace[] = places.map((place) => ({ ...place, home: place.id === profile.placeId }))
  return (
    <main className="about">
      <AboutStage
        places={globe}
        title={`About ${profile.name}`}
      />
    </main>
  )
}
