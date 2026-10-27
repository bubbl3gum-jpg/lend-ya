"use client";
import { MarketplaceRouteState } from "@/components/marketplace/route-state";
export default function ErrorPage({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return <MarketplaceRouteState kind="error" retry={retry} />;
}
