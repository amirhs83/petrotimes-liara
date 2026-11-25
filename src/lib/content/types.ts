/**
 * Shared data types for the Petro Times homepage content layer.
 *
 * These shapes are the SINGLE SOURCE OF TRUTH for the content contract:
 *  - the fixed local snapshot (src/data/homepage-data.json), and
 *  - the remote REST adapter (remote.ts), which expects the exact JSON
 *    documented in docs/API-CONTRACT.md.
 *
 * The backend that produces this JSON is implementation-agnostic — it may be
 * written in any language (Node, Go, Python, PHP, .NET …) as long as the HTTP
 * contract is honored. Nothing in this layer assumes a specific CMS.
 */

/** One news article as rendered anywhere on the homepage. */
export interface Article {
  title: string;
  url: string;
  /** Pre-formatted Persian date line, e.g. "۲۹ مرداد ۱۴۰۵ - ۱۵:۲۳". */
  dateText: string;
  category: string | null;
  categoryUrl: string | null;
  excerpt: string | null;
  /** Thumbnail used in cards (small size variant). */
  image: string | null;
  /** Large variant for hero/TV overlays. */
  imageFull: string | null;
  /**
   * Optional overline / kicker shown above the FEATURED NEWS headline
   * (additive optional field — when absent the element is not rendered).
   */
  eyebrow?: string | null;
  /** Video URL for video-type posts (e.g. TV Petro Times preview loop). */
  videoUrl?: string | null;
  videoType?: string | null;
}

/** FEATURE TITLE ranked item (rank icon PNG path + article fields). */
export interface FeatureArticle {
  title: string;
  url: string;
  dateText: string;
  category: string | null;
  categoryUrl: string | null;
  /** /assets/icons/number-*.png */
  rankIcon: string;
}

/** Header / off-canvas menu item. */
export interface MenuItem {
  label: string;
  href: string;
  /** Current page flag — reproduces the live current-menu-item state. */
  current?: boolean;
}

/** Social link row of the WE ARE SOCIAL widget. */
export interface SocialLink {
  network: string;
  label: string;
  href: string;
}

/** Market ticker item (native fallback marquee). */
export interface TickerItem {
  key: string;
  name: string;
  icon: string;
}

/**
 * Live commodity quote for one ticker item, served by GET /api/market
 * (server-side bridge to the project's real market data source).
 * Values are the raw upstream strings ("3594.00", "+49.00", "1.39%") or
 * null when the upstream publishes no value — never fabricated.
 */
export interface MarketQuote {
  key: string;
  price: string | null;
  change: string | null;
  percent: string | null;
}

/** Newsletter subscribe block (sidebar + off-canvas). */
export interface NewsletterData {
  heading: string;
  text: string;
  placeholder: string;
  button: string;
  disclaimer: string;
  disclaimerLink: string;
}

/** Footer ABOUT US + post columns + copyright. */
export interface FooterData {
  about: {
    heading: string;
    text: string;
    emailHtml: { bold: string; rest: string };
  };
  popularHeading: string;
  latestHeading: string;
  popular: Article[];
  latest: Article[];
  copyright: string;
}

/** Complete homepage data contract. */
export interface HomepageData {
  header: { menu: MenuItem[] };
  ticker: { iframeUrl: string; items: TickerItem[] };
  sections: {
    heroMain: Article;
    heroSecondary: Article[];
    tvPlayer: Article;
    tvPlaylist: Article[];
    topNewsLabel?: { label: string; article: Article };
    topNewsItems?: Article[];
    magazine: { label: string; articles: Article[] };
    featureTitle: { label: string; items: FeatureArticle[] };
    energyMain: Article;
    energySubs: Article[];
    /** the three media tiles panel — own admin section «ادورتایز 1» (key advertise1) */
    advertise1: Article[];
    social: { label: string; links: SocialLink[] };
    newsletter: NewsletterData;
    advertise: { label: string; items: Article[] };
    footer: FooterData;
    offcanvas: {
      whatsHot: Article[];
    };
  };
}
