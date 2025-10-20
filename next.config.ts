import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Ignore TypeScript errors during build (including Vega-Lite library errors)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
