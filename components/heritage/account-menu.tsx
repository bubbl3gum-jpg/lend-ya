"use client";
import { useEffect, useRef, useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function HeritageAccountMenu({
  name,
  links,
  triggerLabel,
  menuTitle = "Your account book",
  navigationLabel = "Account center",
  closeLabel = "Close account navigation",
  actions,
}: {
  name: string;
  triggerLabel?: string;
  menuTitle?: string;
  navigationLabel?: string;
  closeLabel?: string;
  actions?: React.ReactNode;
  links: { href: string; label: string }[];
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);
  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="heritage-account-trigger"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        {triggerLabel ?? `Account center · ${name}`}
      </button>
      <dialog
        ref={dialog}
        className="heritage-account-sheet"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not(:disabled), a[href]",
          );
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClose={() => trigger.current?.focus()}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const b = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < b.left ||
            event.clientX > b.right ||
            event.clientY < b.top ||
            event.clientY > b.bottom
          )
            event.currentTarget.close();
        }}
      >
        <header>
          <div>
            <p className="catalogue-eyebrow">
              Hustlen’ / {triggerLabel ? "Marketplace index" : "Personal index"}
            </p>
            <h2 id={titleId}>{menuTitle}</h2>
          </div>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </header>
        <nav aria-label={navigationLabel}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              onClick={() => dialog.current?.close()}
            >
              {link.label}
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
              >
                <path d="M3 13L13 3M3 3h10v10" />
              </svg>
            </Link>
          ))}
        </nav>
        {actions ? (
          <div className="heritage-menu-actions">{actions}</div>
        ) : null}
      </dialog>
    </>
  );
}
