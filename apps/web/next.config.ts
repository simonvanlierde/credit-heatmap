import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Proxy API calls to the Hono API in development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `http://localhost:${process.env.API_PORT ?? 3001}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
