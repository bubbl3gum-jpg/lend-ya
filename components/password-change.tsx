"use client";
import { useRef, useState } from "react";
import { useLocale } from "./i18n/locale";
import type { MessageId } from "@/lib/i18n/catalogues";
const fields = ["currentPassword", "newPassword", "confirmPassword"] as const;
export function PasswordChange({
  onRevoked,
  onBusyChange,
}: {
  onRevoked: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { locale, t } = useLocale(),
    [values, setValues] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [expired, setExpired] = useState(false),
    [notice, setNotice] = useState<MessageId | null>(null);
  const pending = useRef(false),
    first = useRef<HTMLInputElement>(null);
  return (
    <section
      className="catalogue-section account-security-note"
      aria-labelledby="password-title"
    >
      <h2 id="password-title">{t("password.title")}</h2>
      <p>{t("password.candidate")}</p>
      <p id="password-help" className="my-3 text-sm">
        {t("password.help")}
      </p>
      <form
        lang={locale}
        className="catalogue-form"
        aria-busy={busy}
        onInvalid={(e) => {
          e.preventDefault();
          setNotice("password.input");
          first.current?.focus();
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (pending.current || done || expired) return;
          if (
            !values.currentPassword ||
            values.currentPassword.length > 128 ||
            values.newPassword.length < 8 ||
            values.newPassword.length > 128 ||
            values.newPassword !== values.confirmPassword ||
            values.currentPassword === values.newPassword
          ) {
            setNotice("password.input");
            first.current?.focus();
            return;
          }
          // No overlapping display-name submission; never store credentials to preserve a draft.
          if (
            document
              .querySelector("#account-name")
              ?.closest("form")
              ?.getAttribute("aria-busy") === "true"
          )
            return;
          pending.current = true;
          setBusy(true);
          onBusyChange?.(true);
          setNotice(null);
          try {
            const response = await fetch("/api/account/password", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Hustlen-Password-Change": "1",
              },
              body: JSON.stringify(values),
            });
            const body = await response.json();
            if (
              response.ok &&
              body.changed === true &&
              body.reauthenticationRequired === true
            ) {
              setDone(true);
              onRevoked();
              try {
                for (const key of Object.keys(sessionStorage))
                  if (key.startsWith("hustlen:condition-draft:"))
                    sessionStorage.removeItem(key);
              } catch {}
              return;
            }
            const codes: Readonly<Record<string, MessageId>> = {
              CURRENT: "password.wrong",
              INPUT: "password.input",
              LIMIT: "password.limited",
              SESSION: "password.expired",
              DENIED: "password.denied",
              UNAVAILABLE: "password.denied",
              ORIGIN: "password.origin",
              CONFLICT: "password.conflict",
            };
            setNotice(
              typeof body.code === "string" &&
                Object.prototype.hasOwnProperty.call(codes, body.code)
                ? codes[body.code]
                : "password.failed",
            );
            if (response.status === 401) {
              setExpired(true);
              onRevoked();
            }
          } catch {
            setNotice("password.failed");
          } finally {
            setValues({
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
            pending.current = false;
            setBusy(false);
            onBusyChange?.(false);
          }
        }}
      >
        <fieldset
          className="password-fields"
          disabled={busy || done || expired}
        >
          {fields.map((field, i) => (
            <label key={field} htmlFor={field}>
              {t(
                i === 0
                  ? "password.current"
                  : i === 1
                    ? "password.new"
                    : "password.confirm",
              )}
              <input
                ref={i === 0 ? first : undefined}
                id={field}
                name={field}
                type="password"
                autoComplete={i === 0 ? "current-password" : "new-password"}
                required
                minLength={i === 0 ? 1 : 8}
                maxLength={128}
                value={values[field]}
                aria-describedby={
                  notice ? "password-help password-error" : "password-help"
                }
                aria-invalid={
                  notice === "password.input" ||
                  (i === 0 && notice === "password.wrong")
                }
                onChange={(e) =>
                  setValues({ ...values, [field]: e.target.value })
                }
              />
            </label>
          ))}
          <button type="submit" className="catalogue-button">
            {t(busy ? "password.busy" : "password.submit")}
          </button>
        </fieldset>
        {notice && (
          <p id="password-error" className="catalogue-feedback" role="alert">
            {t(notice)}
          </p>
        )}
        {done && (
          <p className="catalogue-feedback" role="status">
            {t("password.success")}
          </p>
        )}
        {(done || expired) && (
          <a className="account-login-again" href="/login">
            {t("password.signin")}
          </a>
        )}
      </form>
    </section>
  );
}
