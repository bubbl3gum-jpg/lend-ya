import { getCurrentUser } from "@/lib/auth";
import { AccountSettings } from "@/components/account-settings";
export default async function AccountPage() {
 const user = await getCurrentUser(); if (!user) return null;
 return <div><h1 className="mb-6 text-3xl font-semibold">Account settings</h1><p className="mb-4">Email: {user.email}</p><AccountSettings name={user.name} /></div>;
}
