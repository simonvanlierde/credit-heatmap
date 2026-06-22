import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Single self-contained Next.js app: domain logic runs in the browser via
  // @credit-generator/core, and the only server endpoint (ORCID proxy) is a
  // route handler under src/app/api. No external API to proxy to.
  output: "standalone",
};

export default nextConfig;
