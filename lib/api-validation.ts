import { Prisma } from "@prisma/client";

const currencyPattern = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const isoDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parsePositiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

export function parsePathId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export function parseRequiredString(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

export function parseEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();
  return email.length <= 254 && emailPattern.test(email) ? email : null;
}

export function parsePassword(
  value: unknown,
  minLength: number,
  maxLength = 128,
): string | null {
  return typeof value === "string" && value.length >= minLength && value.length <= maxLength
    ? value
    : null;
}

export function parseCurrency(
  value: unknown,
  allowZero: boolean,
): Prisma.Decimal | null {
  const normalized =
    typeof value === "string"
      ? value.trim()
      : typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : "";

  if (!currencyPattern.test(normalized)) {
    return null;
  }

  const amount = new Prisma.Decimal(normalized);
  if (allowZero ? amount.isNegative() : !amount.greaterThan(0)) {
    return null;
  }

  return amount;
}

export function parseIsoDateTime(value: unknown): Date | null {
  if (typeof value !== "string" || !isoDateTimePattern.test(value)) {
    return null;
  }

  const datePart = value.slice(0, 10);
  const calendarDate = new Date(`${datePart}T00:00:00.000Z`);
  if (calendarDate.toISOString().slice(0, 10) !== datePart) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}