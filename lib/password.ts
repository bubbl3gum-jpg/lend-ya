import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export { parseNewPassword, newPasswordRequirements } from "./password-policy";

function derivePasswordKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await derivePasswordKey(password, salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [algorithm, salt, expectedKeyHex] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedKeyHex || !/^[a-f\d]{128}$/i.test(expectedKeyHex)) {
    return false;
  }
  const actualKey = await derivePasswordKey(password, salt);
  return timingSafeEqual(Buffer.from(expectedKeyHex, "hex"), actualKey);
}
