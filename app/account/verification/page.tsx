import { identityActor } from "@/lib/identity/service";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getTrustProfile } from "@/lib/trust-profile";
import { TrustProfile } from "@/components/trust-profile";
export default async function VerificationPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const profile = await getTrustProfile(user.id);
  if (!profile) return null;
  let identityCandidate = false;
  try { await identityActor(); identityCandidate = true; } catch { /* Optional owned-development entry only. */ }
  return (
    <div className="catalogue-trust">
      <h1 className="mb-4 text-3xl font-semibold">
        Trustworthiness &amp; profile verification
      </h1>
      <p className="mb-6">
        Identity badges require platform verification.{" "}
        <Link href="/customer-service" className="underline">
          Contact customer service
        </Link>{" "}
        for verification support.
      </p>
      {identityCandidate && <p className="mb-6"><Link href="/account/identity" className="underline">Identity assurance simulation / 身分驗證模擬（僅限開發測試）</Link></p>}
      <TrustProfile profile={profile} />
    </div>
  );
}
