import { notFound, redirect } from "next/navigation";
import { ownedStaffReadPilot } from "@/lib/staff-read-pilot/bridge";
import { getCurrentUser } from "@/lib/auth";
import { StaffListingInspection } from "@/components/staff-listing-inspection";
export const dynamic = "force-dynamic";
export default async function Page() {
  try {
    await ownedStaffReadPilot();
  } catch {
    notFound();
  }
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "USER" || user.accountStatus !== "ACTIVE") notFound();
  return <StaffListingInspection />;
}
