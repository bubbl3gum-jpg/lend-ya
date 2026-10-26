"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeritageSurface, WheatMark } from "@/components/heritage/experience";
import type { Appearance } from "@/lib/heritage/appearance";

const sections = [
  ["/account", "01", "Personal details"],
  ["/account/activity", "02", "Activity logs"],
  ["/account/verification", "03", "Trust & verification"],
];

export function AccountShell({
  header,
  children,
  initialTheme,
}: {
  initialTheme: Appearance;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <HeritageSurface initialTheme={initialTheme}>
      <a className="catalogue-skip" href="#account-content">
        Skip to account content
      </a>
      {header}
      <main className="catalogue-page">
        <div className="catalogue-running">
          <span>Hustlen’ / The account book</span>
          <span>Personal edition · Nº 01</span>
        </div>
        <div className="catalogue-heading">
          <p className="catalogue-eyebrow">A place for the particulars</p>
          <h1>Your account</h1>
          <p>Keep your details in order. Make room for what comes next.</p>
        </div>
        <div className="catalogue-layout">
          <nav className="catalogue-index" aria-label="Account sections">
            <div className="heritage-index-art">
              <WheatMark />
              <p>
                Small things.
                <br />
                Thoughtfully shared.
              </p>
            </div>
            <p className="catalogue-eyebrow">In this account</p>
            {sections.map(([href, number, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
              >
                <span aria-hidden="true">{number}</span>
                {label}
              </Link>
            ))}
            <Link href="/dashboard">
              <span aria-hidden="true">↗</span>Back to dashboard
            </Link>
          </nav>
          <div id="account-content" tabIndex={-1} className="catalogue-content">
            {children}
          </div>
        </div>
        <footer className="catalogue-footer">
          <span>Hustlen’</span>
          <p>Good things, shared with care.</p>
          <span>Account edition · 01</span>
        </footer>
      </main>
    </HeritageSurface>
  );
}
