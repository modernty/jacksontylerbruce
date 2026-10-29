import type { Metadata } from "next"
import { IBM_Plex_Mono } from "next/font/google"
import { Suspense } from "react"
import { Composer } from "@/src/components/composer"
import { PillsProvider } from "@/src/components/pills"
import { fontFaceCss } from "@/src/content/fonts"
import "./globals.css"

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--plex",
})

export const metadata: Metadata = {
  title: "Tyler Jackson — Designer",
  description: "A timeline of the work, with one question to one view.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const faces = fontFaceCss()
  return (
    <html lang="en" className={`pre ${plex.variable}`}>
      <head>
        {faces ? <style dangerouslySetInnerHTML={{ __html: faces }} /> : null}
      </head>
      <body>
        <div className="top">
          <span>Tyler Jackson — Designer</span>
          <span>Index — 2026</span>
        </div>
        <PillsProvider>
          {children}
          <Suspense fallback={null}>
            <Composer />
          </Suspense>
        </PillsProvider>
      </body>
    </html>
  )
}
