import { catalogues, en, type MessageId } from "./catalogues";
export type Locale = "en" | "zh-TW";
export const localeCookie = "hustlen_locale";
export function parseLocale(value: unknown): Locale {
  return value === "zh-TW" ? "zh-TW" : "en";
}
const warned = new Set<string>();
export function message(
  locale: Locale,
  id: MessageId,
  values: Readonly<Record<string, string | number>> = {},
  source?: Partial<Record<MessageId, string>>,
): string {
  const active = source ?? catalogues[parseLocale(locale)];
  const known = Object.prototype.hasOwnProperty.call(en, id);
  const selected =
    known && Object.prototype.hasOwnProperty.call(active, id)
      ? active[id]
      : undefined;
  if (!selected && process.env.NODE_ENV === "development" && warned.size < 32) {
    const diagnostic = known ? id : "UNKNOWN_MESSAGE";
    if (!warned.has(diagnostic)) {
      warned.add(diagnostic);
      console.warn("[i18n] English fallback", diagnostic);
    }
  }
  const template = selected || (known ? en[id] : en["message.unavailable"]);
  return template.replace(/\{([a-zA-Z]+)\}/g, (placeholder, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : placeholder,
  );
}
export function formatMoney(locale: Locale, value: string | number): string {
  return new Intl.NumberFormat(
    parseLocale(locale) === "en" ? "en-US" : "zh-TW",
    {
      style: "currency",
      currency: "USD",
    },
  ).format(Number(value));
}
export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(
    parseLocale(locale) === "en" ? "en-US" : "zh-TW",
  ).format(value);
}
export function formatTime(locale: Locale, value: Date | string): string {
  return new Intl.DateTimeFormat(
    parseLocale(locale) === "en" ? "en-GB" : "zh-TW",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Taipei",
    },
  ).format(new Date(value));
}
