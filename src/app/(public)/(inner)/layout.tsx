import type { Metadata } from "next";
import { getHomepageData } from "@/lib/content";
import { Chrome } from "@/components/petro/Chrome";
import { MarketTicker } from "@/components/petro/MarketTicker";
import { SiteFooter } from "@/components/petro/SiteFooter";
import { rssAlternates } from "@/lib/site";
import "../../petro-inner.css";

/**
 * Inner-page shell — every route below /news, /category, /tag, /all-post,
 * /search and the static pages renders inside the exact homepage chrome:
 * header (desktop two-bar + mobile), price ticker and the black footer.
 * petro.css comes from the (public) layout; this layer only adds
 * petro-inner.css.
 */

export const metadata: Metadata = {
  alternates: rssAlternates,
};

export default async function InnerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const data = await getHomepageData();
  const s = data.sections;

  return (
    <div className="pt-inner-shell">
      <Chrome menu={data.header.menu} whatsHot={s.offcanvas.whatsHot} newsletter={s.newsletter} />
      <div className="pt-ticker-section">
        <MarketTicker items={data.ticker.items} />
      </div>
      <main className="main-wrap">{children}</main>
      <SiteFooter footer={s.footer} />
    </div>
  );
}
