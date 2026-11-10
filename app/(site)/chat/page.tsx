import type { Metadata } from "next"
import { ConversationStage, type ProjectPreview } from "@/src/components/conversation-stage"
import { careerEntries } from "@/src/content/career"
import { publishCatalog } from "@/src/content/publish"
import type { GlobePlace } from "@/src/globe/types"
import { publicStage } from "@/src/timeline/stage-data"

export const metadata: Metadata = {
  title: "Conversation — Tyler Jackson",
  description: "Ask about Tyler Jackson's work and preview the projects.",
}

export default function ChatPage() {
  const catalog = publishCatalog()
  const previews: ProjectPreview[] = catalog.projects.map((project) => {
    const role = catalog.roles.find((item) => item.id === project.roleId)
    const client = catalog.clients.find((item) => item.id === project.clientId)
    const org = project.orgLabel ?? client?.name ?? ""
    return {
      slug: project.slug,
      name: project.name,
      summary: project.summary,
      meta: [org === project.name ? "" : org, role?.title, role?.yearLabel].filter(Boolean).join(" · "),
      cover: project.media.cover,
    }
  })
  const places: GlobePlace[] = catalog.places.map((place) => ({ ...place, home: place.id === catalog.profile.placeId }))
  return (
    <main className="conversation">
      <ConversationStage previews={previews} places={places} timeline={publicStage().mobile} careers={careerEntries(catalog)} />
    </main>
  )
}
