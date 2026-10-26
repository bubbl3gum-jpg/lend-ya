import { MarketplaceHome } from "@/components/marketplace/home";
export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  return <MarketplaceHome study input={(await searchParams).category} />;
}
