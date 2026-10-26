import { announcementConfig } from "../announcements/config";
/** Reuse strict target/driver validation, but require an independent exact gate/origin/actor list. */
export function settingsConfig(
  env: Record<string, string | undefined> = process.env,
) {
  return announcementConfig({
    ...env,
    HUSTLEN_ANNOUNCEMENT_CANDIDATE:
      env.HUSTLEN_SETTINGS_CANDIDATE === "owned-display-only"
        ? "owned-informational-only"
        : undefined,
    HUSTLEN_ANNOUNCEMENT_ORIGIN: env.HUSTLEN_SETTINGS_ORIGIN,
    HUSTLEN_ANNOUNCEMENT_ADMIN_IDS: env.HUSTLEN_SETTINGS_ADMIN_IDS,
  });
}
