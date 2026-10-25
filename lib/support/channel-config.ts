import { supportCandidateConfig } from "./config";
export const CHANNEL_POLICY = "support-owned-requester-channel-8c-v1";
export function channelCandidateConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const base = supportCandidateConfig(env),
    limit = env.HUSTLEN_SUPPORT_CHANNEL_TEST_LIMIT;
  if (
    env.HUSTLEN_SUPPORT_CHANNEL_CANDIDATE !== "owned-requester-only" ||
    !limit ||
    !/^[1-9]\d{0,2}$/.test(limit) ||
    Number(limit) > 100
  )
    throw Error("Requester channel candidate unavailable");
  return { ...base, messageLimit: Number(limit) };
}
