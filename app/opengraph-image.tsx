import { ImageResponse } from "next/og"
import { HERO, SITE_NAME } from "@/src/site/seo"

export const alt = `${SITE_NAME}. ${HERO}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#FBFBF8", color: "#2E3A87", padding: "72px 96px" }}>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, textTransform: "uppercase" }}>{SITE_NAME}</div>
        <div style={{ display: "flex", fontSize: 64, lineHeight: 1.15, letterSpacing: -1, maxWidth: 880 }}>{HERO}</div>
        <div style={{ display: "flex", width: "100%", height: 1, background: "#2E3A87", opacity: 0.35 }} />
      </div>
    ),
    size,
  )
}
