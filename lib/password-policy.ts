export const newPasswordRequirements =
  "Password must contain 8–128 characters, at least one digit, and at least one uppercase letter.";

export function parseNewPassword(value: unknown): string | null {
  return typeof value === "string" &&
    value.length >= 8 && value.length <= 128 &&
    /[0-9]/.test(value) && /[A-Z]/.test(value)
    ? value : null;
}
