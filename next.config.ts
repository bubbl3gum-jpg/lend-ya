import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "development" &&
  /^[a-f0-9]{24}$/.test(process.env.MRT_TEST_RUN_ID ?? "")
    ? {
        distDir: `.test-artifacts/${process.env.MRT_TEST_RUN_ID}/next`,
        typescript: {
          tsconfigPath: `.test-artifacts/${process.env.MRT_TEST_RUN_ID}/tsconfig.json`,
        },
      }
    : {}),
  // Candidate private references must not enter development access logs.
  // Application error diagnostics remain bounded and enabled independently.
  logging: { incomingRequests: { ignore: [/\/(?:api\/)?dev\/support-(?:agent|requester)(?:\/|$)/, /\/api\/support\/(?:tickets|channels)(?:\/|$)/, /\/customer-service\/tickets(?:\/|$)/] } },
  images: { unoptimized: true },
  experimental: { proxyClientMaxBodySize: "64mb" },
};

export default nextConfig;
