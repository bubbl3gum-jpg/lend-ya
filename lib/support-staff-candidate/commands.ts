import { ticketInput, uuid } from "../support/input";
import { channelMessageInput } from "../support/channel-input";
export type CandidateCommand = Record<string, unknown> & { action: string };
export function supportCommand(
  value: unknown,
  kind: "staff" | "requester",
): CandidateCommand {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid command");
  const b = value as Record<string, unknown>,
    a = b.action;
  if (typeof a !== "string") throw Error("Invalid action");
  const keys: Record<string, string[]> =
    kind === "staff"
      ? {
          admit: [],
          "enroll.begin": ["password"],
          "enroll.finish": ["password", "challengeId", "response"],
          "verify.begin": [],
          "verify.finish": ["challengeId", "response"],
          queue: [],
          ticket: ["ticketId"],
          events: ["ticketId"],
          channels: ["ticketId"],
          read: ["ticketId", "channelId", "after"],
          reply: ["ticketId", "channelId", "content", "requestKey"],
        }
      : {
          tickets: [],
          create: [
            "categoryCode",
            "subject",
            "description",
            "requestKey",
            "bookingId",
            "listingId",
            "reportId",
            "disputeId",
          ],
          ticket: ["ticketId"],
          channel: ["ticketId"],
          read: ["ticketId", "channelId", "after"],
          message: ["ticketId", "channelId", "content", "requestKey"],
        };
  if (
    !Object.hasOwn(keys, a) ||
    Object.keys(b).some((k) => k !== "action" && !keys[a].includes(k))
  )
    throw Error("Unknown fields");
  for (const k of ["ticketId", "channelId", "challengeId"])
    if (keys[a].includes(k) && !uuid(b[k])) throw Error("Invalid selector");
  if (a === "create") {
    const { action: _, ...input } = b;
    void _;
    return { action: a, ...ticketInput(input) };
  }
  if (
    a === "read" &&
    b.after !== undefined &&
    (!Number.isInteger(b.after) ||
      Number(b.after) < 0 ||
      Number(b.after) > 2147483647)
  )
    throw Error("Invalid cursor");
  if (a === "message" || a === "reply")
    return {
      ...b,
      action: a,
      ...channelMessageInput({ content: b.content, requestKey: b.requestKey }),
    };
  if (
    keys[a].includes("password") &&
    (typeof b.password !== "string" || !b.password || b.password.length > 128)
  )
    throw Error("Invalid password input");
  return { ...b, action: a };
}
