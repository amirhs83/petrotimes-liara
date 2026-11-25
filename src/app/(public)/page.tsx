import { getHomepageData } from '@/lib/content';
import { absoluteUrl, siteName, siteNameEn } from '@/lib/site';
import { homepageGraph } from '@/lib/seo/jsonld';
import { JsonLd } from '@/components/petro/JsonLd';
import { OgImageSecureUrl } from '@/components/petro/RawSeoMeta';
import { Chrome } from '@/components/petro/Chrome';
import { MarketTicker } from '@/components/petro/MarketTicker';
import { HighlightsHero, SmallPostCard } from '@/components/petro/PostCards';
import { FeaturedNews } from '@/components/petro/FeaturedNews';
import { TopNewsMobile } from '@/components/petro/TopNewsMobile';
import { TvSection } from '@/components/petro/TvSection';
import { MagazineSlider } from '@/components/petro/MagazineSlider';
import { FeatureTitle } from '@/components/petro/FeatureTitle';
import { SocialWidget } from '@/components/petro/SocialWidget';
import { NewsletterWidget } from '@/components/petro/NewsletterWidget';
import { EnergySection } from '@/components/petro/EnergySection';
import { AdvertiseRow, AdvertiseOne } from '@/components/petro/AdvertiseRow';
import { SiteFooter } from '@/components/petro/SiteFooter';

// homepage reflects the latest published CMS content; cached briefly (ISR)
export const revalidate = 60;

/**
 * Petro Times homepage — assembled from the backend-agnostic content layer.
 * Section order and geometry reproduce the live capture (geometry-1920.json):
 * header 63 → ticker 45 → TOP NEWS (content 788 / sidebar 356) → ENERGY →
 * ADVERTISE (-52px offset) → footer 502 → copyright 41.
 */
export default async function Home() {
  const data = await getHomepageData();
  const s = data.sections;

  return (
    <>
      {/* SEO — WebPage node + og:image:secure_url for the default OG image */}
      <JsonLd
        graph={homepageGraph({
          url: absoluteUrl("/og-default.png"),
          alt: `${siteNameEn} ${siteName}`,
          width: 1200,
          height: 630,
        })}
      />
      <OgImageSecureUrl url={absoluteUrl("/og-default.png")} />

      <Chrome menu={data.header.menu} whatsHot={s.offcanvas.whatsHot} newsletter={s.newsletter} />

      <div className="pt-ticker-section">
        <MarketTicker items={data.ticker.items} />
      </div>

      <main className="main-wrap">
        {/* ============================ SECTION A — TOP NEWS ============================ */}
        <div className="pt-section pt-section-topnews">
          <div className="pt-container">
            <div className="pt-columns">
              <div className="pt-content-col">
                {/* DESKTOP (≥1025) — the ORIGINAL duo arrangement, restored
                    exactly as before the mobile-reference work: hero post in
                    the right column + 4 secondary cards in the left column
                    (live geometry). Hidden on mobile/tablet. */}
                <div className="pt-duo pt-duo-desktop">
                  <div className="pt-duo-hero">
                    {/* typography spec (main-news title): weight 700 — the
                        inline fontWeight is emitted only when weight !== '700',
                        so passing '700' lets the CSS .pt-duo-hero rule own the
                        title instead of a stale inline 900 */}
                    <HighlightsHero article={s.heroMain} weight="700" kicker />
                  </div>
                  <div className="pt-duo-secondary">
                    {s.heroSecondary.map((a) => (
                      <SmallPostCard key={a.url} article={a} size="s" clamp={false} />
                    ))}
                  </div>
                </div>
                {/* MOBILE/TABLET (≤1024) — FEATURED NEWS editorial block per
                    the client mobile reference (359×474); unchanged. */}
                <FeaturedNews article={s.heroMain} />
                {/* MOBILE ONLY (≤767) — TOP NEWS section per the client's
                    1200×1280 reference raster (400px viewport @3x): black
                    bar + 4:3 image-right rows. Hidden ≥768; tablet keeps
                    the .pt-featured-secondary grid below, desktop the duo. */}
                <TopNewsMobile articles={s.heroSecondary} />
                {/* secondary cards — same card design, reflowed below */}
                <div className="pt-featured-secondary">
                  {s.heroSecondary.map((a) => (
                    <SmallPostCard key={a.url} article={a} size="s" clamp={false} />
                  ))}
                </div>
                <TvSection player={s.tvPlayer} playlist={s.tvPlaylist} />
              </div>
              <aside className="pt-sidebar-col">
                <FeatureTitle items={s.featureTitle.items} />
                <MagazineSlider label={s.magazine.label} articles={s.magazine.articles} />
              </aside>
            </div>
          </div>
        </div>

        {/* ============================ SECTION B — ENERGY ============================== */}
        <div className="pt-section pt-section-energy">
          <div className="pt-container">
            <div className="pt-columns">
              <div className="pt-content-col">
                <EnergySection main={s.energyMain} subs={s.energySubs} />
              </div>
              <aside className="pt-sidebar-col">
                <SocialWidget label={s.social.label} links={s.social.links} />
                {/* anchor target for the header Subscribe buttons — the real
                    newsletter capability of the site (no fake checkout) */}
                <div id="pt-newsletter">
                  <NewsletterWidget data={s.newsletter} />
                </div>
              </aside>
            </div>
          </div>
        </div>

        {/* ========================= ADVERTISE 1 ======================================== */}
        {/* the three media tiles that used to close the ENERGY section — their
            own admin-managed panel now (client request), between ENERGY and
            ADVERTISE. No visible heading (client: "برش دار") — placement is
            managed from the dedicated admin section «ادورتایز 1». */}
        <AdvertiseOne items={s.advertise1} />

        {/* ============================== ADVERTISE ===================================== */}
        <AdvertiseRow label={s.advertise.label} items={s.advertise.items} />
      </main>

      <SiteFooter footer={s.footer} />
    </>
  );
}
