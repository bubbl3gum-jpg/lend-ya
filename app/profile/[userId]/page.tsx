import { notFound } from "next/navigation";
import { parsePathId } from "@/lib/api-validation";
import { getTrustProfile } from "@/lib/trust-profile";
import { TrustProfile } from "@/components/trust-profile";
import { SiteHeader } from "@/components/site-header";
export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
 const id = parsePathId((await params).userId); if (id === null) notFound();
 const profile = await getTrustProfile(id); if (!profile) notFound();
 return <main><SiteHeader /><div className="mx-auto max-w-5xl px-6 py-10"><TrustProfile profile={profile} /></div></main>;
}
