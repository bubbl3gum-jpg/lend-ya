"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/locale";
import type { MessageId } from "@/lib/i18n/catalogues";
export function AccountSettings({
  name,
  onSessionExpired,
}: {
  name: string;
  onSessionExpired?: () => void;
}) {
  const { locale, t } = useLocale();
  const [notice, setNotice] = useState<MessageId | null>(null),
    [failed, setFailed] = useState(false),
    [busy, setBusy] = useState(false);
  const [value, setValue] = useState(name),
    [saved, setSaved] = useState(name),
    [invalid, setInvalid] = useState(false),
    [reference, setReference] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  return (
    <form
      lang={locale}
      className="catalogue-form"
      aria-busy={busy}
      onSubmit={async (event) => {
        event.preventDefault();
        setNotice(null);
        setReference("");
        if (!value.trim() || value.length > 100) {
          setFailed(true);
          setInvalid(true);
          setNotice("form.invalid");
          input.current?.focus();
          return;
        }
        setBusy(true);
        setInvalid(false);
        try {
          const response = await fetch("/api/account", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: value }),
          });
          if (response.status === 401) {
            setFailed(true);
            setNotice("form.expired");
            onSessionExpired?.();
            return;
          }
          if (!response.ok) {
            setFailed(true);
            setNotice(response.status === 400 ? "form.invalid" : "form.failed");
            setInvalid(response.status === 400);
            const ref = response.headers.get("X-Error-Id");
            if (ref && /^[a-f0-9-]{36}$/.test(ref)) setReference(ref);
            return;
          }
          setFailed(false);
          setNotice("form.saved");
          setSaved(value.trim());
          setValue(value.trim());
          router.refresh();
        } catch {
          setFailed(true);
          setNotice("form.failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="account-name">{t("form.name")}</label>
      <p id="account-name-help" className="catalogue-help">
        {t("form.nameHelp")}
      </p>
      <input
        ref={input}
        id="account-name"
        name="name"
        autoComplete="nickname"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setNotice((current) => (current === "form.expired" ? current : null));
          setReference("");
          setInvalid(false);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          setFailed(true);
          setInvalid(true);
          setNotice("form.invalid");
          input.current?.focus();
        }}
        required
        maxLength={100}
        aria-invalid={invalid || undefined}
        aria-describedby="account-name-help account-name-error"
        disabled={busy}
      />
      <div className="catalogue-form-actions">
        <button
          type="submit"
          className="catalogue-button heritage-press"
          disabled={busy}
        >
          {t(busy ? "form.saving" : "form.save")}
          <span aria-hidden="true"> →</span>
        </button>
        <span className="catalogue-help">
          {t(value !== saved ? "form.unsaved" : "form.current")}
        </span>
      </div>
      <p
        id="account-name-error"
        className={
          failed ? "catalogue-feedback catalogue-error" : "catalogue-feedback"
        }
        role={failed ? "alert" : "status"}
      >
        {notice && !failed ? (
          <span className="heritage-saved-seal" aria-hidden="true" />
        ) : null}
        {notice ? t(notice) : ""}
      </p>
      {reference ? (
        <p className="catalogue-help">{t("form.reference", { reference })}</p>
      ) : null}
      {notice === "form.expired" ? (
        <Link className="account-login-again" href="/login">
          {t("nav.login")}
        </Link>
      ) : null}
    </form>
  );
}
