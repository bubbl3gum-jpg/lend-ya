import Link from "next/link";
import { cataloguePlate } from "@/lib/heritage/plates";
import Image from "next/image";
import { getMarketplaceDiscovery } from "@/lib/marketplace/discovery";
import { SiteHeader } from "@/components/site-header";
import { readAppearance } from "@/lib/heritage/appearance";
import {
  HeritageSurface,
  HeritageSection,
  EditorialHeading,
  DiscoveryLink,
  WheatMark,
} from "@/components/heritage/experience";
import { MarketplaceRail } from "@/components/marketplace/navigation";
import { ObjectEngraving } from "@/components/heritage/engraving";
export async function MarketplaceHome({
  input,
  study = false,
}: {
  input?: unknown;
  study?: boolean;
}) {
  const { categories, category, listings } =
    await getMarketplaceDiscovery(input);
  const categoryTarget = study ? "/catalogue" : "/listings";
  return (
    <HeritageSurface initialTheme={await readAppearance()}>
      <a className="catalogue-skip" href="#catalogue-content">
        Skip to catalogue content
      </a>
      <SiteHeader catalogue railNavigation />
      <div className="heritage-market-layout">
        <MarketplaceRail />
        <main id="catalogue-content" className="heritage-market-main">
          {study ? (
            <p className="heritage-candidate-label">
              Design study · Real marketplace records · Provisional appearance
            </p>
          ) : (
            <p className="heritage-candidate-label">
              Hustlen’ / A shared catalogue for everyday possibilities
            </p>
          )}
          <section className="heritage-hero" aria-labelledby="harvest-title">
            <Image
              src="/heritage/harvest-landscape.webp"
              alt="Illustrative generated artwork of golden terraced fields and a farmer carrying the harvest"
              fill
              sizes="(max-width: 760px) 100vw, 85vw"
              priority
            />
            <div className="heritage-hero-copy">
              <p className="catalogue-eyebrow">The art of sharing well</p>
              <h1 id="harvest-title">
                Lend.
                <br />
                Borrow.
                <br />
                <em>Grow, together.</em>
              </h1>
              <p>
                Make more of what we already have.
                <br />
                Good things deserve another season.
              </p>
              <DiscoveryLink
                href="#discovery"
                className="heritage-brass-button"
              >
                Explore items <span aria-hidden="true">→</span>
              </DiscoveryLink>
            </div>
            <span className="heritage-hero-seal" aria-hidden="true">
              <WheatMark />
              Hustlen’ · Shared with care
            </span>
          </section>
          <section id="discovery" className="heritage-categories">
            <EditorialHeading number="01" title="Explore the catalogue">
              <p>Categories drawn from eligible marketplace listings.</p>
            </EditorialHeading>
            {categories.length ? (
              <div className="heritage-category-grid">
                {categories.map((c, i) => (
                  <DiscoveryLink
                    key={c.category}
                    current={category === c.category}
                    href={`${categoryTarget}?category=${encodeURIComponent(c.category)}${study ? "#records" : "#marketplace-filters"}`}
                    className={
                      category === c.category
                        ? "heritage-category is-selected"
                        : "heritage-category"
                    }
                  >
                    <span className="catalogue-eyebrow">
                      Plate {String(i + 1).padStart(2, "0")}
                    </span>
                    {cataloguePlate(c.category) ? (
                      <Image
                        className="heritage-plate"
                        src={cataloguePlate(c.category)!}
                        alt=""
                        width={240}
                        height={160}
                      />
                    ) : (
                      <ObjectEngraving category={c.category} />
                    )}
                    <span>{c.category}</span>
                  </DiscoveryLink>
                ))}
              </div>
            ) : (
              <p className="heritage-empty">
                No eligible categories yet.{" "}
                <Link href="/listings">Browse the marketplace</Link>.
              </p>
            )}
          </section>
          <section id="records">
            <EditorialHeading
              number="02"
              title={
                category ? `${category} / Recent listings` : "Recent listings"
              }
            >
              <Link href={study ? "/catalogue#records" : "/listings"}>
                All categories
              </Link>
            </EditorialHeading>
            {listings.length ? (
              <div className="heritage-listings">
                {listings.map((l) => (
                  <article key={l.id}>
                    <Link href={`/listings/${l.id}`}>
                      <div className="heritage-listing-image">
                        <Image
                          src={l.media[0].url}
                          alt={l.title}
                          fill
                          sizes="(max-width: 760px) 90vw, 25vw"
                        />
                      </div>
                      <div>
                        <p className="catalogue-eyebrow">{l.category}</p>
                        <h3>{l.title}</h3>
                        <p>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(Number(l.price))}{" "}
                          <small>/ day</small>
                        </p>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <p className="heritage-empty">No active item listings yet.</p>
            )}
            <Link className="heritage-all-listings" href="/listings">
              Browse all listings →
            </Link>
          </section>
          {!study ? (
            <section
              className="heritage-mrt-entry"
              aria-labelledby="mrt-discovery-title"
            >
              <div>
                <p className="catalogue-eyebrow">Taipei / Along the MRT</p>
                <h2 id="mrt-discovery-title">
                  A familiar station.
                  <br />
                  <em>A useful connection.</em>
                </h2>
                <p>
                  Browse items by their listed pickup stations, then review the
                  owner’s supported locations.
                </p>
                <Link
                  className="heritage-brass-button"
                  href="/listings#marketplace-filters"
                >
                  Browse by MRT pickup station →
                </Link>
              </div>
              <WheatMark />
              <div>
                <h3>Find. Agree. Meet.</h3>
                <p>
                  Choose your item first. The existing booking flow lets you
                  review and agree on a meeting station.
                </p>
                <Link href="/listings/new">Share an item of your own →</Link>
              </div>
            </section>
          ) : null}
          <HeritageSection className="heritage-how">
            <EditorialHeading
              number="03"
              title="A little less owning. A little more possibility."
            />
            <div>
              <section>
                <ObjectEngraving category="camera" />
                <h3>01 / Find your next use</h3>
                <p>Browse real items and ask an owner about availability.</p>
              </section>
              <section>
                <WheatMark />
                <h3>02 / Agree, then meet</h3>
                <p>
                  Arrange the booking and agreed MRT handoff. All existing
                  verification requirements still apply.
                </p>
              </section>
              <section>
                <ObjectEngraving category="tools" />
                <h3>03 / Return with care</h3>
                <p>
                  Complete the return and inspection through the existing rental
                  flow.
                </p>
              </section>
            </div>
          </HeritageSection>
          <footer className="catalogue-footer">
            <span>Hustlen’</span>
            <p>
              Illustrative harvest artwork, not a real listing or verified
              location.
            </p>
            <Link href={study ? "/" : "/listings"}>
              {study ? "Return home" : "Browse listings"}
            </Link>
          </footer>
        </main>
      </div>
    </HeritageSurface>
  );
}
