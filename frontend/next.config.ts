import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Proxy monitoring API calls to Flask backend.
        // Excludes auth routes, register, verify-email, forgot/reset-password
        // which are all handled by Next.js Route Handlers.
        source: "/api/((?!auth|register|verify-email|forgot-password|reset-password).*)",
        destination: `${process.env.NEXT_PUBLIC_FLASK_API_URL || "http://127.0.0.1:5000"}/api/$1`,
      },
    ];
  },
};

export default nextConfig;
