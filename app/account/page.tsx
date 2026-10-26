import { getCurrentUser } from "@/lib/auth";
import { AccountSettings } from "@/components/account-settings";
export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <>
      <section className="catalogue-section" aria-labelledby="details-title">
        <div className="catalogue-section-title">
          <p className="catalogue-eyebrow">01 / Personal details</p>
          <h2 id="details-title">The name you share.</h2>
          <p>A small introduction, wherever you meet in the marketplace.</p>
        </div>
        <dl className="catalogue-record">
          <div>
            <dt>Email address</dt>
            <dd>
              {user.email}
              <small>
                Your sign-in address. This form changes your display name only.
              </small>
            </dd>
          </div>
        </dl>
        <AccountSettings name={user.name} />
      </section>
      <section className="catalogue-editorial" aria-labelledby="care-title">
        <svg
          className="catalogue-botanical"
          viewBox="0 0 180 210"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          aria-hidden="true"
        >
          <path d="M86 199 Q83 118 95 18 M89 170 Q35 152 35 100 Q78 108 89 152 M90 145 Q145 122 147 73 Q105 86 91 127 M91 113 Q52 90 53 49 Q85 65 93 94 M94 80 Q126 57 120 22 Q98 36 94 64 M35 100 L88 166 M147 73 L91 142 M53 49 L92 109 M120 22 L94 77" />
          <path d="M75 193 Q89 187 101 192 M60 202 H115 M57 198 H118" />
          <path d="M48 126 L70 133 M55 140 L80 145 M132 101 L111 110 M122 117 L101 124 M64 72 L79 81 M113 46 L101 55" />
        </svg>
        <div>
          <p className="catalogue-eyebrow">Cultivating a little trust</p>
          <h2>
            Good exchanges begin
            <br />
            with a familiar name.
          </h2>
          <p>
            Your display name accompanies your listings and conversations.
            Choose something others can recognise when arranging an exchange.
          </p>
        </div>
      </section>
    </>
  );
}
