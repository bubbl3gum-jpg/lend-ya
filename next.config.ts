import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  experimental: { proxyClientMaxBodySize: "64mb" },
};

export default nextConfig;
