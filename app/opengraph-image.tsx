import { ImageResponse } from "next/og"
import { tokens } from "@/src/design/tokens"
import { SITE_NAME } from "@/src/site/seo"

export const alt = `${SITE_NAME}, Miami, FL`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/** The share card for every page without its own cover: the name, the title and a timeline rule. */
export default function ShareCard() {
  const { ink, paper } = tokens.color
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: paper, color: ink }}>
        <div style={{ display: "flex", fontSize: 72 }}>Jackson, Tyler Bruce</div>
        <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: ink }} />
          <div style={{ flex: 1, height: 2, background: ink }} />
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${ink}` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 36 }}>
          <div>Designer</div>
          <div>Miami, FL</div>
        </div>
      </div>
    ),
    size,
  )
}
