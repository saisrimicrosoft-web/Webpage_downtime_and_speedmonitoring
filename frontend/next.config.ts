import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async rewrites() {
    // Flask proxy removed — all data now comes from Supabase directly.
    return [];
  },
};

export default nextConfig;
