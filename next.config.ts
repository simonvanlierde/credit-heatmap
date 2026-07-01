import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Single self-contained Next.js app: domain logic runs in the browser via
  // @credit-generator/core, and the only server endpoint (ORCID proxy) is a
  // route handler under src/app/api. No external API to proxy to.
  output: "standalone",
  // core ships its TS source (just-in-time internal package); Next transpiles it.
  transpilePackages: ["@credit-generator/core"],
  // core uses NodeNext ".js" specifiers on .ts files; map them to source on resolve.
  // Turbopack has no extensionAlias equivalent yet (vercel/next.js#82945), so the
  // build/dev scripts pass --webpack to opt into this builder under Next 16.
  webpack: (config) => {
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return config;
  },
};

export default nextConfig;
