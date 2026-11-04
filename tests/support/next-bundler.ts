/** Use Next's supported Webpack dev mode for the Windows acceptance profile.
 * Production builds/start and all application/security flags remain unchanged.
 * The explicit selector permits reproducing either bundler without editing code.
 */
export function nextDevBundlerArgs(
  production = false,
  platform: string = process.platform,
  env: Record<string, string | undefined> = process.env,
): string[] {
  if (production) return [];
  const selected = env.MRT_TEST_BUNDLER ?? (platform === "win32" ? "webpack" : "turbopack");
  if (!["webpack", "turbopack"].includes(selected)) throw Error("Invalid test bundler selection");
  return selected === "webpack" ? ["--webpack"] : [];
}
