"use client";
import { useEffect, useRef, useState } from "react";
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
    first = useRef<HTMLInputElement>(null),
    feedback = useRef<HTMLParagraphElement>(null),
    success = useRef<HTMLParagraphElement>(null),
    attempted = useRef(false);
  const [visible, setVisible] = useState([false, false, false]);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  useEffect(() => {
    if (busy || !attempted.current) return;
    if (done) success.current?.focus();
    else if (notice) feedback.current?.focus();
  }, [notice, done, busy]);
  function validate() {
    const invalid: string[] = [];
    if (!values.currentPassword || values.currentPassword.length > 128)
      invalid.push("currentPassword");
    if (
      values.newPassword.length < 8 ||
      values.newPassword.length > 128 ||
      values.newPassword === values.currentPassword
    )
      invalid.push("newPassword");
    if (
      values.confirmPassword.length < 8 ||
      values.confirmPassword !== values.newPassword
    )
      invalid.push("confirmPassword");
    setInvalidFields(invalid);
    return invalid;
  }
  const visibilityLabels = [
    ["password.showCurrent", "password.hideCurrent"],
    ["password.showNew", "password.hideNew"],
    ["password.showConfirm", "password.hideConfirm"],
  ] as const;
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
        aria-labelledby="password-title"
        aria-busy={busy}
        onInvalid={(e) => {
          e.preventDefault();
          setNotice("password.input");
          attempted.current = false;
          validate();
          const target =
            e.currentTarget.querySelector<HTMLInputElement>("input:invalid");
          target?.focus();
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (pending.current || done || expired) return;
          const invalid = validate();
          if (invalid.length) {
            attempted.current = false;
            setNotice("password.input");
            document.getElementById(invalid[0])?.focus();
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
          setVisible([false, false, false]);
          attempted.current = true;
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
            setVisible([false, false, false]);
            setInvalidFields([]);
            pending.current = false;
            setBusy(false);
            onBusyChange?.(false);
          }
        }}
      >
        {notice && (
          <p
            ref={feedback}
            tabIndex={-1}
            id="password-error"
            className="catalogue-feedback"
            role="alert"
          >
            {t(notice)}
          </p>
        )}
        <fieldset
          className="password-fields"
          aria-label={t("password.group")}
          disabled={busy || done || expired}
        >
          {fields.map((field, i) => (
            <div key={field}>
              <label htmlFor={field}>
                {t(
                  i === 0
                    ? "password.current"
                    : i === 1
                      ? "password.new"
                      : "password.confirm",
                )}
              </label>
              <div className="password-control-row">
                <input
                  ref={i === 0 ? first : undefined}
                  id={field}
                  name={field}
                  type={visible[i] ? "text" : "password"}
                  autoComplete={i === 0 ? "current-password" : "new-password"}
                  required
                  minLength={i === 0 ? 1 : 8}
                  maxLength={128}
                  value={values[field]}
                  aria-describedby={
                    notice ? "password-help password-error" : "password-help"
                  }
                  aria-invalid={
                    invalidFields.includes(field) ||
                    (i === 0 && notice === "password.wrong")
                  }
                  onChange={(e) => {
                    setValues({ ...values, [field]: e.target.value });
                    setInvalidFields((current) =>
                      current.filter((v) => v !== field),
                    );
                  }}
                />
                <button
                  type="button"
                  aria-label={t(visibilityLabels[i][visible[i] ? 1 : 0])}
                  aria-pressed={visible[i]}
                  aria-controls={field}
                  onClick={() =>
                    setVisible((current) =>
                      current.map((v, n) => (n === i ? !v : v)),
                    )
                  }
                >
                  {t(visible[i] ? "password.hide" : "password.show")}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" className="catalogue-button">
            {t(busy ? "password.busy" : "password.submit")}
          </button>
        </fieldset>
        {done && (
          <p
            ref={success}
            tabIndex={-1}
            className="catalogue-feedback"
            role="status"
          >
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
