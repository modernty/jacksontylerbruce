import { AxisStage } from "@/src/components/axis-stage"
import { publicStage } from "@/src/timeline/stage-data"

export const metadata = { title: "Projects" }

export default function ProjectsPage() {
  const stage = publicStage()
  return (
    <main>
      <AxisStage mode="projects" desktop={stage.desktop} mobile={stage.mobile} cards={stage.cards} />
    </main>
  )
}
