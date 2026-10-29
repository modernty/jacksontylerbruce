import { AxisStage } from "@/src/components/axis-stage"
import { publicStage } from "@/src/timeline/stage-data"

export default function TimelinePage() {
  const stage = publicStage()
  return <AxisStage mode="timeline" desktop={stage.desktop} mobile={stage.mobile} cards={stage.cards} />
}
