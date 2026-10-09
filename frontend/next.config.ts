import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Proxy monitoring API calls to Flask backend.
        // Auth routes (/api/auth/*, /api/register, etc.) are handled by
        // Next.js Route Handlers and won't reach this rewrite.
        source: "/api/:path*",
        destination: process.env.NEXT_PUBLIC_FLASK_API_URL || "http://127.0.0.1:5000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
