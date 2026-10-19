"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/chat", label: "Chat moderation" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
];
export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="space-y-2">
      {adminLinks.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`block rounded-xl px-4 py-3 text-sm font-medium ${active ? "bg-emerald-400 text-slate-950" : "text-slate-200 hover:bg-slate-800"}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
export function AdminBreadcrumbs() {
  const parts = usePathname().split("/").filter(Boolean);
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-2 text-sm text-slate-500"
    >
      {parts.map((part, index) => (
        <span key={index}>
          {index ? (
            <span aria-hidden="true" className="mr-2">
              /
            </span>
          ) : null}
          <Link href={`/${parts.slice(0, index + 1).join("/")}`}>
            {index === 0
              ? "Administration"
              : /^\d+$/.test(part)
                ? `#${part}`
                : part[0].toUpperCase() + part.slice(1)}
          </Link>
        </span>
      ))}
    </nav>
  );
}
