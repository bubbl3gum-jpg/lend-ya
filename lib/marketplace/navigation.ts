import type { MessageId } from "@/lib/i18n/catalogues";
/** Implemented public destinations; no invented standalone MRT map or gated chat link. */
export const marketplaceLinks = [
  { href: "/", label: "nav.home" },
  { href: "/listings", label: "nav.browse" },
  { href: "/#discovery", label: "nav.categories" },
  { href: "/listings#marketplace-filters", label: "nav.mrt" },
  { href: "/customer-service", label: "nav.support" },
] satisfies { href: string; label: MessageId }[];
