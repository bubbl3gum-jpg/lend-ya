import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep an explicitly isolated development test server separate from normal .next files.
  ...(process.env.NODE_ENV === "development" &&
  /^[a-f0-9]{24}$/.test(process.env.MRT_TEST_RUN_ID ?? "")
    ? {
        distDir: `.test-artifacts/${process.env.MRT_TEST_RUN_ID}/next`,
        typescript: {
          tsconfigPath: `.test-artifacts/${process.env.MRT_TEST_RUN_ID}/tsconfig.json`,
        },
      }
    : {}),
};

export default nextConfig;
