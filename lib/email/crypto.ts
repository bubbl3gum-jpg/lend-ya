import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { EmailMessage } from "./templates";

export function encryptEmail(message: EmailMessage, key: Buffer, jobId: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(`hustlen-email:v1:${jobId}`));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(message), "utf8"), cipher.final()]);
  return ["v1", nonce.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptEmail(payload: string, key: Buffer, jobId: string): EmailMessage {
  try {
    const parts = payload.split(".");
    if (parts.length !== 4 || parts[0] !== "v1") throw new Error();
    const nonce = Buffer.from(parts[1], "base64url"), tag = Buffer.from(parts[2], "base64url");
    if (nonce.length !== 12 || tag.length !== 16) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAAD(Buffer.from(`hustlen-email:v1:${jobId}`));
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(Buffer.from(parts[3], "base64url")), decipher.final()]);
    const message = JSON.parse(plain.toString("utf8"));
    if (!message || typeof message.from !== "string" || !Array.isArray(message.to) || message.to.length !== 1 ||
      typeof message.to[0] !== "string" || ![message.subject, message.html, message.text].every((value) => typeof value === "string")) throw new Error();
    return message;
  } catch {
    throw new Error("Encrypted email payload is invalid.");
  }
}
