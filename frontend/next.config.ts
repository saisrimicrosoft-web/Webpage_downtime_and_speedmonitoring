import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Flask proxy removed — all data now comes from Supabase directly.
    return [];
  },
};

export default nextConfig;
