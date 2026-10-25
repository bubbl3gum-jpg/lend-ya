import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../auth";
import { ownedSupportRuntime, staffWorkerCommand } from "./bridge";
export async function supportCandidatePage(kind: "staff" | "requester") {
  let config;
  try {
    config = await ownedSupportRuntime();
  } catch {
    notFound();
  }
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (
    user.accountStatus !== "ACTIVE" ||
    (kind === "staff" && user.role !== "USER")
  )
    notFound();
  if (kind === "staff") {
    try {
      await staffWorkerCommand(
        (await cookies()).get("p2p_session")?.value ?? "",
        { action: "admit" },
        config,
      );
    } catch {
      notFound();
    }
  }
}
