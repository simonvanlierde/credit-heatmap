import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers() {
    return Promise.resolve([
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: "base-uri 'self'; frame-ancestors 'none'; object-src 'none'" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ]);
  },
  // Single self-contained Next.js app: domain logic runs in the browser via
  // @credit-generator/core, and the only server endpoint (ORCID proxy) is a
  // route handler under src/app/api. Deploy bundling is handled by
  // @opennextjs/cloudflare, so no Next `output` mode is needed.
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
