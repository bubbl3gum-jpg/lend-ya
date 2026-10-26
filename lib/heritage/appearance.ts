import { cookies } from "next/headers";
export type Appearance = "light" | "dark" | "system";
export async function readAppearance(): Promise<Appearance> {
  const value = (await cookies()).get("hustlen_appearance")?.value;
  return value === "light" || value === "dark" ? value : "system";
}
