import { notFound } from "next/navigation"
import { AxisStage } from "@/src/components/axis-stage"
import { focusAnnotation } from "@/src/content/answers"
import { publishCatalog } from "@/src/content/publish"
import { publicStage } from "@/src/timeline/stage-data"

export default async function FocusPage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme: slug } = await params
  const catalog = publishCatalog()
  const theme = catalog.themes.find((item) => item.slug === slug)
  if (!theme) notFound()
  const stage = publicStage()
  return (
    <AxisStage
      mode="focus"
      desktop={stage.desktop}
      mobile={stage.mobile}
      cards={stage.cards}
      annotation={focusAnnotation(theme, catalog)}
    />
  )
}
