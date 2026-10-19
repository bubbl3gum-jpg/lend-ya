export function chatAvailable(userId: number): boolean {
  return process.env.CHAT_ENABLED === "true" || (process.env.CHAT_PREVIEW_USER_IDS ?? "").split(",").some((id) => /^[1-9]\d*$/.test(id.trim()) && Number(id) === userId);
}
export function retentionSettings() {
  const days = (name: string) => { const raw = process.env[name] ?? ""; return /^[1-9]\d{0,4}$/.test(raw) ? Number(raw) : null; };
  return { messageDays: days("CHAT_MESSAGE_RETENTION_DAYS"), reportedEvidenceDays: days("CHAT_EVIDENCE_RETENTION_DAYS"), automaticDeletionEnabled: false };
}
