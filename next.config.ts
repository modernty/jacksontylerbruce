import type { NextConfig } from "next"
import { legacyRedirects } from "./src/site/redirects"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return legacyRedirects()
  },
}

export default nextConfig
