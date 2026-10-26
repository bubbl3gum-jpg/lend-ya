import "server-only";
import { cookies } from "next/headers";
import { localeCookie, parseLocale } from "./core";
export async function readLocale() {
  return parseLocale((await cookies()).get(localeCookie)?.value);
}
