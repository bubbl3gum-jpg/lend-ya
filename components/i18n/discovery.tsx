"use client";
import { useLinkStatus } from "next/link";
import Image from "next/image";
import { useLocale } from "./locale";
import { formatMoney } from "@/lib/i18n/core";
import { categoryLabel, detailLabel } from "@/lib/i18n/listings";
export function DiscoveryRegion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { locale } = useLocale();
  return (
    <main lang={locale} className={className}>
      {children}
    </main>
  );
}
export function Money({ value }: { value: string }) {
  const { locale } = useLocale();
  return <>{formatMoney(locale, value)}</>;
}
export function CategoryLabel({ value }: { value: string }) {
  const { locale } = useLocale();
  return <>{categoryLabel(locale, value)}</>;
}
export function DetailLabel({ value }: { value: string }) {
  const { locale } = useLocale();
  return <>{detailLabel(locale, value)}</>;
}
export function AdditionalPhoto({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const { t } = useLocale();
  return (
    <Image
      src={src}
      alt={t("listing.additionalPhoto", { title })}
      fill
      sizes="(max-width: 640px) 25vw, 15vw"
      className="object-cover"
    />
  );
}

export function DiscoveryPending() {
  const { pending } = useLinkStatus();
  const { t } = useLocale();
  return pending ? (
    <span className="discovery-progress" role="status">
      {t("journey.loading")}
    </span>
  ) : null;
}
