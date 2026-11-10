import type { Metadata } from "next"
import { IBM_Plex_Mono } from "next/font/google"
import { Suspense } from "react"
import { SiteAnalytics } from "@/src/components/analytics"
import { Composer } from "@/src/components/composer"
import { PillsProvider } from "@/src/components/pills"
import { fontFaceCss } from "@/src/content/fonts"
import { HERO, SITE_NAME, indexable, siteUrl } from "@/src/site/seo"
import "./globals.css"

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--plex",
})

const live = indexable()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: SITE_NAME,
  description: HERO,
  robots: live ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: { type: "website", siteName: SITE_NAME, title: SITE_NAME, description: HERO, url: "/" },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: HERO },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const faces = fontFaceCss()
  return (
    <html lang="en" className={`pre ${plex.variable}`}>
      <head>
        {faces ? <style dangerouslySetInnerHTML={{ __html: faces }} /> : null}
      </head>
      <body>
        <header className="top">
          <span>Tyler Jackson — Designer</span>
          <span>Index — 2026</span>
        </header>
        <PillsProvider>
          <main>{children}</main>
          <Suspense fallback={null}>
            <Composer />
          </Suspense>
        </PillsProvider>
        <SiteAnalytics />
      </body>
    </html>
  )
}
