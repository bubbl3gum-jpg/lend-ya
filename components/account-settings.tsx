"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AccountSettings({ name }: { name: string }) {
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState(name);
  const [saved, setSaved] = useState(name);
  const router = useRouter();
  return (
    <form
      className="catalogue-form"
      aria-busy={busy}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          const response = await fetch("/api/account", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: value }),
          });
          const result = await response.json();
          setFailed(!response.ok);
          setMessage(
            response.ok
              ? "Settings saved."
              : typeof result.error === "string"
                ? result.error
                : "Unable to save settings.",
          );
          if (response.ok) {
            setSaved(value.trim());
            setValue(value.trim());
            router.refresh();
          }
        } catch {
          setFailed(true);
          setMessage(
            "Unable to save settings. Your changes are still here; please try again.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="account-name">Display name</label>
      <p id="account-name-help" className="catalogue-help">
        Shown to other people on Hustlen’. Up to 100 characters.
      </p>
      <input
        id="account-name"
        name="name"
        autoComplete="nickname"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setMessage("");
        }}
        required
        maxLength={100}
        aria-describedby="account-name-help"
        disabled={busy}
      />
      <div className="catalogue-form-actions">
        <button type="submit" className="catalogue-button" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
          <span aria-hidden="true"> →</span>
        </button>
        <span className="catalogue-help">
          {value !== saved ? "Unsaved changes" : "Your details are up to date."}
        </span>
      </div>
      <p
        className={
          failed ? "catalogue-feedback catalogue-error" : "catalogue-feedback"
        }
        role={failed ? "alert" : "status"}
      >
        {message}
      </p>
    </form>
  );
}
