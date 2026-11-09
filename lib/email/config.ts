import { parseEmail } from "../api-validation";

export type EmailConfig = {
  mode: "resend-test" | "resend-production";
  apiKey: string;
  encryptionKey: Buffer;
  origin: string;
  from: string;
  testRecipient?: string;
  clientIpHeader?: string;
};

export function readEmailConfig(env: Record<string, string | undefined> = process.env, requireApiKey = true): EmailConfig | null {
  if (!env.RECOVERY_EMAIL_MODE || env.RECOVERY_EMAIL_MODE === "disabled") return null;
  const mode = env.RECOVERY_EMAIL_MODE;
  const fail = () => { throw new Error("Recovery email configuration is invalid."); };
  if (mode !== "resend-test" && mode !== "resend-production") return fail();
  if ((requireApiKey && !env.RESEND_API_KEY) || /[\r\n]/.test(env.RESEND_API_KEY ?? "")) return fail();
  const encodedKey = env.RECOVERY_EMAIL_ENCRYPTION_KEY ?? "";
  const encryptionKey = Buffer.from(encodedKey, "base64");
  if (encryptionKey.length !== 32 || encryptionKey.toString("base64") !== encodedKey) return fail();
  let appUrl: URL;
  try { appUrl = new URL(env.RECOVERY_APP_ORIGIN ?? ""); } catch { return fail(); }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(appUrl.hostname);
  if (appUrl.username || appUrl.password || appUrl.search || appUrl.hash || appUrl.pathname !== "/") return fail();
  if (appUrl.protocol !== "https:" && !(appUrl.protocol === "http:" && loopback && mode === "resend-test")) return fail();
  const fromEmail = parseEmail(env.RECOVERY_EMAIL_FROM);
  if (!fromEmail || /[<>\r\n]/.test(fromEmail)) return fail();
  const testRecipient = parseEmail(env.RECOVERY_EMAIL_TEST_RECIPIENT);
  if (mode === "resend-test" && !testRecipient) return fail();
  if (mode === "resend-production" && (loopback || fromEmail.endsWith("@resend.dev"))) return fail();
  const clientIpHeader = env.RECOVERY_TRUSTED_IP_HEADER?.toLowerCase();
  if (clientIpHeader && !["x-real-ip", "cf-connecting-ip"].includes(clientIpHeader)) return fail();
  if (!loopback && !clientIpHeader) return fail();
  return { mode, apiKey: env.RESEND_API_KEY ?? "", encryptionKey, origin: appUrl.origin,
    from: `Hustlen' <${fromEmail}>`, testRecipient: testRecipient ?? undefined, clientIpHeader };
}
