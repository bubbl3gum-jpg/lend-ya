"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const preferenceKey = "hustlen:catalogue-theme";
let memoryTheme = "light";
function snapshot() {
  try {
    const stored = localStorage.getItem(preferenceKey);
    return stored === "dark" || stored === "light" ? stored : memoryTheme;
  } catch {
    return memoryTheme;
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("hustlen:theme", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("hustlen:theme", callback);
  };
}
const sections = [
  ["/account", "01", "Personal details"],
  ["/account/activity", "02", "Activity logs"],
  ["/account/verification", "03", "Trust & verification"],
];

export function AccountShell({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "light");
  const pathname = usePathname();
  function changeTheme() {
    memoryTheme = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(preferenceKey, memoryTheme);
    } catch {
      /* This tab remains usable without storage. */
    }
    window.dispatchEvent(new Event("hustlen:theme"));
  }
  return (
    <div className="catalogue" data-theme={theme}>
      <a className="catalogue-skip" href="#account-content">
        Skip to account content
      </a>
      {header}
      <main className="catalogue-page">
        <div className="catalogue-running">
          <span>Hustlen’ / The account book</span>
          <button
            type="button"
            className="catalogue-theme"
            onClick={changeTheme}
            aria-pressed={theme === "dark"}
          >
            Dark appearance{" "}
            <span aria-hidden="true">{theme === "dark" ? "●" : "○"}</span>
          </button>
        </div>
        <div className="catalogue-heading">
          <p className="catalogue-eyebrow">A place for the particulars</p>
          <h1>Your account</h1>
          <p>Keep your details in order. Make room for what comes next.</p>
        </div>
        <div className="catalogue-layout">
          <nav className="catalogue-index" aria-label="Account sections">
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
    </div>
  );
}
