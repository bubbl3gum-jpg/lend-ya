import { getCurrentUser } from "@/lib/auth";
import { AccountDetails } from "@/components/account-details";
export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <AccountDetails
      name={user.name}
      email={user.email}
      suspended={user.accountStatus === "SUSPENDED"}
      adminSecurity={user.role === "ADMIN" && user.accountStatus === "ACTIVE"}
    />
  );
}
