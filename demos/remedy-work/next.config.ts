import type { NextConfig } from "next";

/**
 * Built as static files into the portfolio, under /demos/remedy-work. The original site
 * sits behind a password gate on Vercel; this copy is the public portfolio version.
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/demos/remedy-work",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
