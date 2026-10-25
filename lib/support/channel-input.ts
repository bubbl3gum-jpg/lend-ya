import { uuid } from "./input";
export function channelMessageInput(body: Record<string, unknown>) {
  if (
    Object.keys(body).some((k) => !["content", "requestKey"].includes(k)) ||
    !uuid(body.requestKey) ||
    typeof body.content !== "string" ||
    !body.content.trim() ||
    body.content.trim().length > 2000 ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body.content)
  )
    throw Error("Invalid requester test message.");
  return { content: body.content.trim(), requestKey: body.requestKey };
}
export function messageCursor(params: URLSearchParams) {
  for (const k of params.keys())
    if (k !== "after" || params.getAll(k).length !== 1)
      throw Error("Unknown message filter.");
  const value = params.get("after") ?? "0";
  if (!/^(0|[1-9]\d*)$/.test(value) || Number(value) > 2147483647)
    throw Error("Invalid message cursor.");
  return Number(value);
}
