/** Node 24 test loader only. Next normally resolves this build-time marker itself.
 * Preserve normal React resolution when exercising Node services: setting the
 * global react-server condition also changes React and breaks next/navigation.
 * This resolves only the marker to Next's own server empty module. It does not
 * mock session, role, reviewer, transaction or evidence authorization checks.
 */
import { registerHooks, createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
if (
  !/^[a-f0-9]{24}$/.test(process.env.MRT_TEST_RUN_ID ?? "") ||
  process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL ||
  process.env.NODE_ENV === "production"
)
  throw Error("Owned isolated test runner required.");
const require = createRequire(import.meta.url);
const empty = pathToFileURL(
  path.join(
    path.dirname(require.resolve("next/package.json")),
    "dist/compiled/server-only/empty.js",
  ),
).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier === "server-only" ? empty : specifier,
      context,
    );
  },
});
