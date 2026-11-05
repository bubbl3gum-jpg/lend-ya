import type { NextConfig } from "next";

/** Compiler artifacts belong to one owned test-server incarnation, not its database. */
export function ownedTestOutput(env: Record<string, string | undefined>): string | undefined {
  if (env.NODE_ENV !== "development" || !/^[a-f0-9]{24}$/.test(env.MRT_TEST_RUN_ID ?? "")) return;
  const base = `.test-artifacts/${env.MRT_TEST_RUN_ID}/next`;
  const instance = env.MRT_TEST_SERVER_INSTANCE;
  if (instance === undefined) return base;
  if (!/^[1-9][0-9]{0,3}$/.test(instance)) throw Error("Invalid owned test server instance");
  return `${base}/server-${instance}`;
}
const testOutput = ownedTestOutput(process.env);
const nextConfig: NextConfig = {
  ...(testOutput
    ? {
        distDir: testOutput,
        typescript: {
          tsconfigPath: `.test-artifacts/${process.env.MRT_TEST_RUN_ID}/tsconfig.json`,
        },
      }
    : {}),
  // Candidate private references must not enter development access logs.
  // Application error diagnostics remain bounded and enabled independently.
  logging: { incomingRequests: { ignore: [/\/(?:api\/)?admin\/locations\/lab(?:\/|$)/, /\/(?:api\/)?dev\/support-(?:agent|requester)(?:\/|$)/, /\/api\/support\/(?:tickets|channels)(?:\/|$)/, /\/customer-service\/tickets(?:\/|$)/] } },
  images: { unoptimized: true },
  experimental: { proxyClientMaxBodySize: "64mb" },
};

export default nextConfig;
