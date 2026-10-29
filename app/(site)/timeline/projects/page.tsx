import { AxisStage } from "@/src/components/axis-stage"
import { publicStage } from "@/src/timeline/stage-data"

export default function ProjectsPage() {
  const stage = publicStage()
  return <AxisStage mode="projects" desktop={stage.desktop} mobile={stage.mobile} cards={stage.cards} />
}
