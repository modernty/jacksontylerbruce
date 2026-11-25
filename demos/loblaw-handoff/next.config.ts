import type { NextConfig } from "next";

/**
 * Built as static files into the portfolio, under /demos/loblaw-handoff. The portfolio opens
 * /showcase (the four running flows); the full spec stays one link away.
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/demos/loblaw-handoff",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
