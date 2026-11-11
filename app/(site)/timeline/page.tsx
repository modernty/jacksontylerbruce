import { AxisStage } from "@/src/components/axis-stage"
import { publicStage } from "@/src/timeline/stage-data"

export const metadata = { title: "Timeline" }

export default function TimelinePage() {
  const stage = publicStage()
  return (
    <main>
      <AxisStage mode="timeline" desktop={stage.desktop} mobile={stage.mobile} cards={stage.cards} />
    </main>
  )
}
