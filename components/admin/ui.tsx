import Link from "next/link";
import type { ReactNode } from "react";
import { formatRentalTime } from "@/lib/booking-time";
export const adminDate = (value: Date | string | null | undefined) =>
  value ? formatRentalTime(value) : "Not recorded";
export const adminMoney = (
  value: { toString(): string } | string | number | null,
) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(value?.toString() ?? "0"),
  );
export function AdminTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8 min-w-0 break-words">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${["ACTIVE", "COMPLETED", "ADMIN"].includes(status) ? "bg-emerald-100 text-emerald-900" : ["DISPUTED", "CANCELLED", "INACTIVE", "SUSPENDED"].includes(status) ? "bg-rose-100 text-rose-900" : "bg-slate-100 text-slate-700"}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
export function AdminPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 break-words rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
export function DetailFields({
  fields,
}: {
  fields: Array<[string, ReactNode]>;
}) {
  return (
    <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label} className="min-w-0 break-words">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm">
            {value ?? "Not recorded"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function AdminTable({
  headers,
  rows,
  title,
  empty = "No matching records.",
}: {
  headers: string[];
  rows: Array<{ id: number; cells: ReactNode[] }>;
  title: string;
  empty?: string;
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={title}
      className="max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white"
    >
      <table className="w-full whitespace-nowrap text-left text-sm">
        <caption className="sr-only">{title}</caption>
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className="px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-slate-100 hover:bg-slate-50"
              >
                {row.cells.map((cell, index) => (
                  <td key={index} className="px-4 py-4">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-10 text-center text-slate-500"
              >
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export function AdminRecordLink({
  kind,
  id,
  children,
}: {
  kind: "users" | "listings" | "bookings";
  id: number;
  children: ReactNode;
}) {
  return (
    <Link
      className="font-medium text-emerald-800 underline decoration-emerald-200 underline-offset-4"
      href={`/admin/${kind}/${id}`}
    >
      {children}
    </Link>
  );
}
