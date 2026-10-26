import { adminApi, AdminInputError } from "@/lib/admin/auth";
import {
  announcementDirectory,
  announcementHistory,
  announcementCandidate,
  mutateAnnouncement,
} from "@/lib/announcements/service";
import { readJsonObject } from "@/lib/api-response";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return adminApi(async () => {
    const q = new URL(request.url).searchParams;
    if (
      [...q.keys()].some((k) => k !== "history") ||
      q.getAll("history").length > 1
    )
      throw new AdminInputError("Invalid selector.");
    return q.has("history")
      ? { events: await announcementHistory(q.get("history")!) }
      : { announcements: await announcementDirectory() };
  });
}
export async function POST(request: Request) {
  return adminApi(async () => {
    const { config } = await announcementCandidate();
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
      throw new AdminInputError("Invalid candidate request.", 403);
    const body = await readJsonObject(request);
    if (!body) throw new AdminInputError("Invalid announcement command.");
    return mutateAnnouncement(body);
  });
}
