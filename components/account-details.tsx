"use client";
import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/locale";
import { AccountSettings } from "@/components/account-settings";
export function AccountDetails({
  name,
  email,
  suspended,
  adminSecurity,
}: {
  name: string;
  email: string;
  suspended: boolean;
  adminSecurity: boolean;
}) {
  const { t } = useLocale();
  const [sessionExpired, setSessionExpired] = useState(false);
  return (
    <>
      <section className="catalogue-section" aria-labelledby="details-title">
        <div className="catalogue-section-title">
          <p className="catalogue-eyebrow">{t("account.details")}</p>
          <h2 id="details-title">{t("account.nameTitle")}</h2>
          <p>{t("account.nameIntro")}</p>
        </div>
        <dl className="catalogue-record">
          <div>
            <dt>{t("account.email")}</dt>
            <dd>
              {sessionExpired ? t("account.hidden") : email}
              <small>{t("account.emailNote")}</small>
            </dd>
          </div>
        </dl>
        <dl className="catalogue-record">
          <div>
            <dt>{t("account.status")}</dt>
            <dd>
              {sessionExpired
                ? t("account.hidden")
                : t(suspended ? "account.suspended" : "account.active")}
            </dd>
          </div>
        </dl>
        <AccountSettings
          name={name}
          onSessionExpired={() => setSessionExpired(true)}
        />
      </section>
      <section className="catalogue-section account-security-note">
        <h2>{t("account.security")}</h2>
        <p>{t("account.passwordUnavailable")}</p>
        <p>{t("account.sessionUnavailable")}</p>
        {adminSecurity && !sessionExpired ? (
          <Link href="/admin/account-security">
            {t("account.adminSession")}
          </Link>
        ) : null}
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
          <p className="catalogue-eyebrow">{t("account.care")}</p>
          <h2 id="care-title">{t("account.careTitle")}</h2>
          <p>{t("account.careCopy")}</p>
        </div>
      </section>
    </>
  );
}
