import { requireAdminPage } from "@/lib/admin/auth";
import { settingsInventory } from "@/lib/admin/settings";
import {
  readSettings,
  settingsEditorAvailable,
} from "@/lib/platform-settings/service";
import { PlatformSettingsWorkspace } from "@/components/admin/platform-settings";
import { logOperationalError } from "@/lib/operational-error";
import type { SettingView } from "@/lib/platform-settings/registry";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireAdminPage();
  const inventory = await settingsInventory();
  let available = await settingsEditorAvailable(),
    initial: SettingView[] = [];
  if (available) {
    try {
      initial = await readSettings();
    } catch (e) {
      available = false;
      logOperationalError("settings.editor_unavailable", e);
    }
  }
  return (
    <PlatformSettingsWorkspace
      inventory={inventory}
      initial={initial}
      available={available}
    />
  );
}
