import type { Metadata } from "next"
import { IBM_Plex_Mono } from "next/font/google"
import { Suspense } from "react"
import { Composer } from "@/src/components/composer"
import { PillsProvider } from "@/src/components/pills"
import { TopBar } from "@/src/components/top-bar"
import { ViewModeProvider } from "@/src/components/view-mode"
import { loadCatalog } from "@/src/content/catalog"
import { fontFaceCss } from "@/src/content/fonts"
import "./tokens.css"
import "./tailwind.css"
import "./globals.css"

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--plex",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://jacksontylerbruce.com"),
  title: "Tyler Jackson — Designer",
  description: "A timeline of the work, with one question to one view.",
  openGraph: { title: "Tyler Jackson — Designer", description: "A timeline of the work, with one question to one view.", type: "website" },
  twitter: { card: "summary_large_image" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const faces = fontFaceCss()
  const { profile } = loadCatalog()
  return (
    <html lang="en" className={`pre ${plex.variable}`}>
      <head>
        {faces ? <style dangerouslySetInnerHTML={{ __html: faces }} /> : null}
      </head>
      <body>
        <ViewModeProvider>
          <TopBar location={profile.location} email={profile.email} linkedin={profile.linkedin} />
          <PillsProvider>
            {children}
            <Suspense fallback={null}>
              <Composer />
            </Suspense>
          </PillsProvider>
        </ViewModeProvider>
      </body>
    </html>
  )
}
