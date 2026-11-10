import { ImageResponse } from "next/og"
import { tokens } from "@/src/design/tokens"

export const size = { width: 64, height: 64 }
export const contentType = "image/png"

/** A plain circle in the ink blue. */
export default function Icon() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", borderRadius: "50%", background: tokens.color.ink }} />, size)
}
