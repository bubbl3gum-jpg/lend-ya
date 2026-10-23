"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export const adminNavigationGroups = [
  { label: "General", links: [{ href: "/admin", label: "Overview" }] },
  {
    label: "Operations",
    links: [
      { href: "/admin/bookings", label: "Bookings" },
      { href: "/admin/disputes", label: "Disputes" },
      { href: "/admin/listings", label: "Listings" },
      { href: "/admin/reports", label: "Reports" },
    ],
  },
  {
    label: "Community",
    links: [
      { href: "/admin/users", label: "Users" },
      { href: "/admin/chat", label: "Chat moderation" },
    ],
  },
  {
    label: "System",
    links: [{ href: "/admin/audit-logs", label: "Audit Logs" }],
  },
];
export const adminLinks = adminNavigationGroups.flatMap((group) => group.links);
export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="space-y-6">
      {adminNavigationGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/admin" &&
                  pathname.startsWith(`${link.href}/`));
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${active ? "bg-emerald-400 text-slate-950" : "text-slate-200 hover:bg-slate-800"}`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
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
