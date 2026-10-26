"use client";
import Link from "next/link";
import Image from "next/image";
import { cataloguePlate } from "@/lib/heritage/plates";
import {
  HeritageSection,
  EditorialHeading,
  DiscoveryLink,
  WheatMark,
} from "@/components/heritage/experience";
import { MarketplaceRail } from "@/components/marketplace/navigation";
import { ObjectEngraving } from "@/components/heritage/engraving";
import { useLocale } from "@/components/i18n/locale";
import { formatMoney } from "@/lib/i18n/core";
export type HomeData = {
  categories: { category: string }[];
  category?: string;
  listings: {
    id: number;
    title: string;
    category: string;
    price: string;
    media: { url: string }[];
  }[];
};
export function MarketplaceHomeView({
  data,
  study,
}: {
  data: HomeData;
  study: boolean;
}) {
  const { locale, t } = useLocale();
  const { categories, category, listings } = data;
  const categoryTarget = study ? "/catalogue" : "/listings";
  return (
    <div className="heritage-market-layout">
      <MarketplaceRail />
      <main id="catalogue-content" className="heritage-market-main">
        {study ? (
          <p className="heritage-candidate-label">{t("home.study")}</p>
        ) : (
          <p className="heritage-candidate-label">{t("home.edition")}</p>
        )}
        <section className="heritage-hero" aria-labelledby="harvest-title">
          <Image
            src="/heritage/harvest-landscape.webp"
            alt={t("home.alt")}
            fill
            sizes="(max-width: 760px) 100vw, 85vw"
            priority
          />
          <div className="heritage-hero-copy">
            <p className="catalogue-eyebrow">{t("home.kicker")}</p>
            <h1 id="harvest-title">
              {t("home.lend")}
              <br />
              {t("home.borrow")}
              <br />
              <em>{t("home.grow")}</em>
            </h1>
            <p>
              {t("home.more")}
              <br />
              {t("home.season")}
            </p>
            <DiscoveryLink href="#discovery" className="heritage-brass-button">
              {t("home.explore")} <span aria-hidden="true">→</span>
            </DiscoveryLink>
          </div>
          <span className="heritage-hero-seal" aria-hidden="true">
            <WheatMark />
            {t("home.seal")}
          </span>
        </section>
        <section id="discovery" className="heritage-categories">
          <EditorialHeading number="01" title={t("home.catalogue")}>
            <p>{t("home.categoriesNote")}</p>
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
                    {t("home.plate", {
                      number: String(i + 1).padStart(2, "0"),
                    })}
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
              {t("home.noCategories")}{" "}
              <Link href="/listings">{t("home.browseMarket")}</Link>.
            </p>
          )}
        </section>
        <section id="records">
          <EditorialHeading
            number="02"
            title={
              category
                ? t("home.categoryRecent", { category })
                : t("home.recent")
            }
          >
            <Link href={study ? "/catalogue#records" : "/listings"}>
              {t("home.allCategories")}
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
                        {formatMoney(locale, l.price)}{" "}
                        <small>{t("home.day")}</small>
                      </p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="heritage-empty">{t("home.noListings")}</p>
          )}
          <Link className="heritage-all-listings" href="/listings">
            {t("home.browseAll")}
          </Link>
        </section>
        {!study ? (
          <section
            className="heritage-mrt-entry"
            aria-labelledby="mrt-discovery-title"
          >
            <div>
              <p className="catalogue-eyebrow">{t("home.taipei")}</p>
              <h2 id="mrt-discovery-title">
                {t("home.station")}
                <br />
                <em>{t("home.connection")}</em>
              </h2>
              <p>{t("home.stationCopy")}</p>
              <Link
                className="heritage-brass-button"
                href="/listings#marketplace-filters"
              >
                {t("home.stationAction")}
              </Link>
            </div>
            <WheatMark />
            <div>
              <h3>{t("home.meet")}</h3>
              <p>{t("home.meetCopy")}</p>
              <Link href="/listings/new">{t("home.share")}</Link>
            </div>
          </section>
        ) : null}
        <HeritageSection className="heritage-how">
          <EditorialHeading number="03" title={t("home.howTitle")} />
          <div>
            <section>
              <ObjectEngraving category="camera" />
              <h3>{t("home.how1")}</h3>
              <p>{t("home.how1Copy")}</p>
            </section>
            <section>
              <WheatMark />
              <h3>{t("home.how2")}</h3>
              <p>{t("home.how2Copy")}</p>
            </section>
            <section>
              <ObjectEngraving category="tools" />
              <h3>{t("home.how3")}</h3>
              <p>{t("home.how3Copy")}</p>
            </section>
          </div>
        </HeritageSection>
        <footer className="catalogue-footer">
          <span>Hustlen’</span>
          <p>{t("home.artNote")}</p>
          <Link href={study ? "/" : "/listings"}>
            {t(study ? "home.return" : "home.browseListings")}
          </Link>
        </footer>
      </main>
    </div>
  );
}
