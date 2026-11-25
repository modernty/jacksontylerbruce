import type { NextConfig } from "next"
import { legacyRedirects } from "./src/site/redirects"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return legacyRedirects()
  },
  // Demos are static sites built into public/demos/<slug>/. A path with no file of its own
  // is one of their pages, so it serves that folder's index.html.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [{ source: "/demos/:path*", destination: "/demos/:path*/index.html" }],
      fallback: [],
    }
  },
}

export default nextConfig
