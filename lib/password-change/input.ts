import { parsePassword } from "../api-validation";
export type PasswordChangeInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
export function passwordChangeInput(
  body: Record<string, unknown> | null,
): PasswordChangeInput | null {
  if (
    !body ||
    Object.keys(body).length !== 3 ||
    Object.keys(body).some(
      (k) => !["currentPassword", "newPassword", "confirmPassword"].includes(k),
    )
  )
    return null;
  const currentPassword = parsePassword(body.currentPassword, 1),
    newPassword = parsePassword(body.newPassword, 8),
    confirmPassword = parsePassword(body.confirmPassword, 8);
  if (
    !currentPassword ||
    !newPassword ||
    !confirmPassword ||
    newPassword !== confirmPassword ||
    currentPassword === newPassword
  )
    return null;
  return { currentPassword, newPassword, confirmPassword };
}
