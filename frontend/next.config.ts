import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    const backendUrl = (
      process.env.BACKEND_URL ?? "http://localhost:8000/api/v1"
    ).replace(/\/$/, "");
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
