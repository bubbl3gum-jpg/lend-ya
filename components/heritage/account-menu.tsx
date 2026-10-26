"use client";
import { useEffect, useRef, useId } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/locale";
import type { MessageId } from "@/lib/i18n/catalogues";
import { usePathname } from "next/navigation";
export function HeritageAccountMenu({
  name,
  links,
  triggerLabel,
  menuTitle = "nav.accountTitle",
  navigationLabel = "nav.accountNav",
  closeLabel = "nav.closeAccount",
  actions,
}: {
  name: string;
  triggerLabel?: MessageId;
  menuTitle?: MessageId;
  navigationLabel?: MessageId;
  closeLabel?: MessageId;
  actions?: React.ReactNode;
  links: { href: string; label: MessageId }[];
}) {
  const { locale, t } = useLocale();
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
        {triggerLabel ? t(triggerLabel) : t("nav.account", { name })}
      </button>
      <dialog
        ref={dialog}
        className="heritage-account-sheet"
        lang={locale}
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
              Hustlen’ /{" "}
              {t(triggerLabel ? "nav.marketIndex" : "nav.personalIndex")}
            </p>
            <h2 id={titleId}>{t(menuTitle)}</h2>
          </div>
          <button
            type="button"
            aria-label={t(closeLabel)}
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </header>
        <nav aria-label={t(navigationLabel)}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              onClick={() => dialog.current?.close()}
            >
              {t(link.label)}
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
