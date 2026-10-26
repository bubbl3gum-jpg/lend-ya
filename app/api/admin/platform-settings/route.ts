import { adminApi, AdminInputError } from "@/lib/admin/auth";
import {
  readSettings,
  historySettings,
  settingsActor,
  mutateSetting,
} from "@/lib/platform-settings/service";
import { readJsonObject } from "@/lib/api-response";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return adminApi(async () => {
    const q = new URL(request.url).searchParams;
    if (
      [...q.keys()].some((k) => !["key", "before"].includes(k)) ||
      [...q.keys()].some((k) => q.getAll(k).length !== 1) ||
      (q.has("before") && !q.has("key"))
    )
      throw new AdminInputError("Invalid settings selector.");
    if (!q.has("key")) return { settings: await readSettings() };
    const before = q.get("before");
    if (before !== null && !/^[1-9]\d{0,9}$/.test(before))
      throw new AdminInputError("Invalid history cursor.");
    return {
      events: await historySettings(
        q.get("key"),
        before === null ? undefined : Number(before),
      ),
    };
  });
}
export async function POST(request: Request) {
  return adminApi(async () => {
    const { config } = await settingsActor();
    if (
      new URL(request.url).search ||
      request.headers.get("origin") !== config.origin ||
      request.headers.get("host") !== new URL(config.origin).host ||
      request.headers.get("sec-fetch-site") === "cross-site" ||
      request.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    )
      throw new AdminInputError("Invalid settings request.", 403);
    const body = await readJsonObject(request);
    if (!body) throw new AdminInputError("Invalid settings command.");
    return mutateSetting(body);
  });
}
