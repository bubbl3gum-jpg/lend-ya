"use client";
import { createContext, useContext, useSyncExternalStore } from "react";
import {
  localeCookie,
  parseLocale,
  message,
  type Locale,
} from "@/lib/i18n/core";
import type { MessageId } from "@/lib/i18n/catalogues";
let transient: Locale | undefined;
function cookieValue() {
  try {
    return document.cookie
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(localeCookie + "="))
      ?.slice(localeCookie.length + 1);
  } catch {
    return undefined;
  }
}
function snapshot(): Locale {
  return transient ?? parseLocale(cookieValue());
}
function subscribe(callback: () => void) {
  window.addEventListener("hustlen:locale", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("hustlen:locale", callback);
    window.removeEventListener("storage", callback);
  };
}
function changeLocale(value: string) {
  const locale = parseLocale(value);
  try {
    document.cookie = `${localeCookie}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  } catch {
    /* Nonessential preference stays in this document. */
  }
  transient = cookieValue() === locale ? undefined : locale;
  try {
    localStorage.setItem("hustlen:locale", locale);
  } catch {
    /* Cookie is authoritative; current-document fallback remains usable. */
  }
  window.dispatchEvent(new Event("hustlen:locale"));
}
const Context = createContext({
  locale: "en" as Locale,
  setLocale: changeLocale,
});
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const locale = useSyncExternalStore(subscribe, snapshot, () => initialLocale);
  return (
    <Context.Provider value={{ locale, setLocale: changeLocale }}>
      {children}
    </Context.Provider>
  );
}
export function useLocale() {
  const value = useContext(Context);
  return {
    ...value,
    t: (id: MessageId, values?: Readonly<Record<string, string | number>>) =>
      message(value.locale, id, values),
  };
}
export function T({
  id,
  values,
}: {
  id: MessageId;
  values?: Readonly<Record<string, string | number>>;
}) {
  const { locale, t } = useLocale();
  return <span lang={locale}>{t(id, values)}</span>;
}
export function LanguageSelect({ disabled = false }: { disabled?: boolean }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <label>
      {t("pref.language")}
      <select
        aria-label={t("pref.language")}
        value={locale}
        disabled={disabled}
        onChange={(e) => setLocale(e.target.value)}
      >
        <option value="en">English</option>
        <option value="zh-TW">繁體中文（台灣）</option>
      </select>
    </label>
  );
}
