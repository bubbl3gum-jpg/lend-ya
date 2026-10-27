import { announcementConfig } from "../announcements/config";
export function passwordChangeConfig(
  env: Record<string, string | undefined> = process.env,
) {
  if (env.HUSTLEN_SUPPORT_STAFF_CANDIDATE)
    throw Error("Password candidate unavailable");
  return announcementConfig({
    ...env,
    HUSTLEN_ANNOUNCEMENT_CANDIDATE:
      env.HUSTLEN_PASSWORD_CHANGE_CANDIDATE === "owned-password-only"
        ? "owned-informational-only"
        : undefined,
    HUSTLEN_ANNOUNCEMENT_ORIGIN: env.HUSTLEN_PASSWORD_CHANGE_ORIGIN,
    HUSTLEN_ANNOUNCEMENT_ADMIN_IDS: env.HUSTLEN_PASSWORD_CHANGE_USER_IDS,
  });
}
