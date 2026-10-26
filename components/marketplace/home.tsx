import { getMarketplaceDiscovery } from "@/lib/marketplace/discovery";
import { SiteHeader } from "@/components/site-header";
import { readAppearance } from "@/lib/heritage/appearance";
import { readLocale } from "@/lib/i18n/server";
import { HeritageSurface } from "@/components/heritage/experience";
import { T } from "@/components/i18n/locale";
import { MarketplaceHomeView } from "./home-view";
export async function MarketplaceHome({
  input,
  study = false,
}: {
  input?: unknown;
  study?: boolean;
}) {
  const data = await getMarketplaceDiscovery(input);
  return (
    <HeritageSurface
      initialTheme={await readAppearance()}
      initialLocale={await readLocale()}
    >
      <a className="catalogue-skip" href="#catalogue-content">
        <T id="home.skip" />
      </a>
      <SiteHeader catalogue railNavigation />
      <MarketplaceHomeView
        data={{
          ...data,
          listings: data.listings.map((l) => ({
            ...l,
            price: l.price.toString(),
          })),
        }}
        study={study}
      />
    </HeritageSurface>
  );
}
