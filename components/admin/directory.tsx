import Link from "next/link";
import { BookingStatus } from "@prisma/client";
import { requireAdminPage, AdminInputError } from "@/lib/admin/auth";
import { getAdminDirectory } from "@/lib/admin/data";
import {
  parseAdminQuery,
  toSearchParams,
  type SearchParams,
  type Directory,
} from "@/lib/admin/query";
import { prisma } from "@/lib/prisma";
import {
  AdminTitle,
  AdminTable,
  AdminRecordLink,
  StatusBadge,
  adminDate,
  adminMoney,
} from "@/components/admin/ui";
import type { ReactNode } from "react";
export async function AdminDirectory({
  kind,
  searchParams,
}: {
  kind: Directory;
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = toSearchParams(await searchParams);
  let query;
  try {
    query = parseAdminQuery(params, kind);
  } catch (error) {
    if (error instanceof AdminInputError)
      return (
        <p role="alert">
          Invalid filters: {error.message}{" "}
          <Link href={`/admin/${kind}`} className="underline">
            Reset filters
          </Link>
        </p>
      );
    throw error;
  }
  const data = await getAdminDirectory(kind, query);
  const categories =
    kind === "listings"
      ? await prisma.listing.groupBy({
          by: ["category"],
          orderBy: { category: "asc" },
        })
      : [];
  const rows: Array<{ id: number; cells: ReactNode[] }> = data.items.map(
    (item) => {
      if ("email" in item)
        return {
          id: item.id,
          cells: [
            <AdminRecordLink key="id" kind="users" id={item.id}>
              #{item.id}
            </AdminRecordLink>,
            item.name,
            item.email,
            <StatusBadge key="role" status={item.role} />,
            <StatusBadge key="account" status={item.accountStatus} />,
            adminDate(item.createdAt),
            item.verificationStatus,
          ],
        };
      if ("category" in item)
        return {
          id: item.id,
          cells: [
            <AdminRecordLink key="id" kind="listings" id={item.id}>
              #{item.id} · {item.title}
            </AdminRecordLink>,
            <AdminRecordLink key="owner" kind="users" id={item.owner.id}>
              {item.owner.name}
            </AdminRecordLink>,
            item.category,
            adminMoney(item.price),
            <StatusBadge key="status" status={item.status} />,
            item.adminRestricted ? "Restricted" : "None",
            adminDate(item.createdAt),
          ],
        };
      return {
        id: item.id,
        cells: [
          <AdminRecordLink key="id" kind="bookings" id={item.id}>
            #{item.id}
          </AdminRecordLink>,
          item.listing.title,
          item.owner.name,
          item.renter.name,
          adminDate(item.startAt),
          adminDate(item.endAt),
          <StatusBadge key="status" status={item.status} />,
          adminMoney(item.totalPrice),
          adminDate(item.createdAt),
        ],
      };
    },
  );
  const headers =
    kind === "users"
      ? [
          "User ID",
          "Display name",
          "Email",
          "Role",
          "Account status",
          "Registered",
          "Verification",
        ]
      : kind === "listings"
        ? [
            "Listing / item",
            "Owner",
            "Category",
            "Daily price",
            "Status",
            "Admin restriction",
            "Created",
          ]
        : [
            "Booking ID",
            "Item",
            "Owner",
            "Borrower",
            "Pickup",
            "Return",
            "Status",
            "Rental fee",
            "Created",
          ];
  const title = kind[0].toUpperCase() + kind.slice(1);
  const link = (page: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    return `/admin/${kind}?${next.toString()}`;
  };
  const field =
    "min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm";
  return (
    <>
      <AdminTitle
        title={title}
        description={`Search and inspect all platform ${kind}. These views do not change records.`}
      />
      <form
        method="GET"
        action={`/admin/${kind}`}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4"
      >
        <label className="grid min-w-0 gap-1 text-xs font-medium">
          Search
          <input
            name="q"
            defaultValue={query.q}
            maxLength={120}
            placeholder={
              kind === "users"
                ? "Name or email"
                : kind === "listings"
                  ? "Item title"
                  : "ID, item or participant"
            }
            className={field}
          />
        </label>
        {kind === "users" ? (
          <label className="grid min-w-0 gap-1 text-xs font-medium">
            Account status
            <select
              name="accountStatus"
              defaultValue={query.accountStatus ?? ""}
              className={field}
            >
              <option value="">All accounts</option>
              <option>ACTIVE</option>
              <option>SUSPENDED</option>
            </select>
          </label>
        ) : null}
        {kind === "listings" ? (
          <label className="grid min-w-0 gap-1 text-xs font-medium">
            Admin restriction
            <select
              name="restricted"
              defaultValue={
                query.restricted === undefined ? "" : String(query.restricted)
              }
              className={field}
            >
              <option value="">All listings</option>
              <option value="true">Restricted</option>
              <option value="false">Unrestricted</option>
            </select>
          </label>
        ) : null}
        {kind === "users" ? (
          <label className="grid min-w-0 max-w-full gap-1 text-xs font-medium">
            Role
            <select
              name="role"
              defaultValue={query.role ?? ""}
              className={field}
            >
              <option value="">All roles</option>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
        ) : (
          <label className="grid min-w-0 max-w-full gap-1 text-xs font-medium">
            Status
            <select
              name="status"
              defaultValue={query.status ?? ""}
              className={field}
            >
              <option value="">All statuses</option>
              {(kind === "listings"
                ? ["ACTIVE", "INACTIVE"]
                : Object.values(BookingStatus)
              ).map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === "listings" ? (
          <label className="grid min-w-0 max-w-full gap-1 text-xs font-medium">
            Category
            <select
              name="category"
              defaultValue={query.category ?? ""}
              className={field}
            >
              <option value="">All categories</option>
              {categories.map(({ category }) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {kind !== "users" ? (
          <label className="grid min-w-0 max-w-full gap-1 text-xs font-medium">
            Owner ID
            <input
              name="ownerId"
              type="number"
              min={1}
              max={2147483647}
              defaultValue={query.ownerId ?? ""}
              className={`${field} w-32`}
            />
          </label>
        ) : null}
        {kind === "bookings" ? (
          <label className="grid min-w-0 max-w-full gap-1 text-xs font-medium">
            Borrower ID
            <input
              name="renterId"
              type="number"
              min={1}
              max={2147483647}
              defaultValue={query.renterId ?? ""}
              className={`${field} w-32`}
            />
          </label>
        ) : null}
        <label className="grid min-w-0 max-w-full gap-1 text-xs font-medium">
          Page size
          <select
            name="pageSize"
            defaultValue={query.pageSize}
            className={field}
          >
            {Array.from(new Set([query.pageSize, 10, 20, 50, 100]))
              .sort((a, b) => a - b)
              .map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
          </select>
        </label>
        <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white">
          Apply filters
        </button>
        <Link href={`/admin/${kind}`} className="px-2 py-2 text-sm underline">
          Reset
        </Link>
      </form>
      <AdminTable headers={headers} rows={rows} title={`${title} directory`} />
      <nav
        aria-label="Pagination"
        className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"
      >
        <p>
          {data.pagination.total} records · Page {data.pagination.page} of{" "}
          {data.pagination.totalPages}
        </p>
        <div className="flex gap-4">
          {query.page > 1 ? (
            <Link href={link(query.page - 1)} className="underline">
              Previous
            </Link>
          ) : (
            <span aria-disabled="true" className="text-slate-400">
              Previous
            </span>
          )}
          {query.page < data.pagination.totalPages ? (
            <Link href={link(query.page + 1)} className="underline">
              Next
            </Link>
          ) : (
            <span aria-disabled="true" className="text-slate-400">
              Next
            </span>
          )}
        </div>
      </nav>
    </>
  );
}
