/**
 * Content Adapter — CMS (Prisma) ⇄ PetroTimes homepage contract.
 *
 * This layer is the heart of the merge: it reads the BimeNews CMS data model
 * (Post, Category, HomeSection, SectionPlacement) and produces the exact
 * `HomepageData` JSON documented in docs/API-CONTRACT.md — the same contract
 * the pixel-perfect PetroTimes components were built against.
 *
 * Rules (mirroring the contract):
 *  - `dateText` is PRE-FORMATTED Persian Jalali: «۲۹ مرداد ۱۴۰۵ - ۱۵:۲۳»
 *    (the backend owns calendar formatting; components render verbatim).
 *  - `title` / `excerpt` are plain text (lead is stored sanitized; titles are
 *    plain by validation).
 *  - URLs are absolute (NEXT_PUBLIC_SITE_URL) so OG tags and links are
 *    correct in every environment.
 *  - Only PUBLISHED posts with publishedAt in the past are ever returned.
 *
 * Slot mapping (CMS section key → contract slots):
 *  hero      [1]  → heroMain, [2..5] → heroSecondary
 *  videos    [1]  → tvPlayer, [2..6] → tvPlaylist
 *  topnews   [1]  → topNewsLabel.article, [2..4] → topNewsItems
 *  magazine  [1..5] → magazine.articles
 *  feature   [1..3] → featureTitle.items (rank icons 1..3)
 *  energy    [1] → energyMain, [2..3] → energySubs, [4..6] → energyGrid
 *  advertise [1..2] → advertise.items
 *  Automatic (no manual placement): footer.popular / footer.latest /
 *  offcanvas.whatsHot from most-viewed and latest queries.
 */

import { db, withDbRetry } from "@/lib/db";
import { relUrl } from "@/lib/site";
import { faDateLong, faTime } from "@/lib/post-format";
import { getSnapshot } from "./snapshot";
import type { Article, FeatureArticle, HomepageData, MenuItem } from "./types";

 

const publishedWhere = () => ({
  status: "PUBLISHED" as const,
  publishedAt: { lte: new Date() },
});

const postInclude = {
  category: { select: { name: true, slug: true } },
  homeImage: { select: { url: true } },
} as const;

/** Media URLs stay app-relative for HTML rendering (see relUrl). */
function mediaUrl(url: string | null | undefined): string | null {
  return relUrl(url);
}

function toArticle(p: any): Article {
  const publishedAt = new Date(p.publishedAt);
  const image = mediaUrl(p.homeImage?.url);
  return {
    title: p.title,
    // HTML hrefs must stay relative — absolute site URLs would navigate
    // preview/proxied visitors off the site (siteUrl ≠ browser origin).
    url: `/news/${encodeURIComponent(p.slug)}`,
    dateText: `${faDateLong(publishedAt)} - ${faTime(publishedAt)}`,
    category: p.category?.name ?? null,
    categoryUrl: p.category ? `/category/${p.category.slug}` : null,
    excerpt: p.lead || null,
    image,
    imageFull: image,
    eyebrow: p.kicker || null,
  };
}

function toFeatureArticle(a: Article, index: number): FeatureArticle {
  const rankIcons = [
    "/assets/icons/number-one_2097.png",
    "/assets/icons/two_10093046.png",
    "/assets/icons/number-3_11822196.png",
  ];
  // `a` is already an Article (getSectionPosts output) — reuse its
  // pre-formatted fields; `a.publishedAt` does not exist on Article.
  return {
    title: a.title,
    url: a.url,
    dateText: a.dateText,
    category: a.category,
    categoryUrl: a.categoryUrl,
    rankIcon: rankIcons[Math.min(index, rankIcons.length - 1)],
  };
}

/** Posts placed in a homepage section, ordered by position. */
async function getSectionPosts(key: string): Promise<Article[]> {
  try {
    const placements = await withDbRetry(() =>
      db.sectionPlacement.findMany({
        where: { section: { key }, post: publishedWhere() },
        orderBy: { position: "asc" },
        include: { post: { include: postInclude } },
      })
    );
    return placements.map((pl) => toArticle(pl.post));
  } catch (err) {
    console.error(`[cms] section "${key}" query failed:`, err);
    return [];
  }
}

/** Automatic "most viewed" (footer popular + off-canvas What's Hot). */
async function getMostViewed(limit = 4): Promise<Article[]> {
  try {
    const posts = await withDbRetry(() =>
      db.post.findMany({
        where: publishedWhere(),
        orderBy: [{ views: "desc" }, { publishedAt: "desc" }],
        take: limit,
        include: postInclude,
      })
    );
    return posts.map(toArticle);
  } catch (err) {
    console.error("[cms] most-viewed query failed:", err);
    return [];
  }
}

/** Automatic "latest news" (footer latest column). */
async function getLatest(limit = 4): Promise<Article[]> {
  try {
    const posts = await withDbRetry(() =>
      db.post.findMany({
        where: publishedWhere(),
        orderBy: { publishedAt: "desc" },
        take: limit,
        include: postInclude,
      })
    );
    return posts.map(toArticle);
  } catch (err) {
    console.error("[cms] latest query failed:", err);
    return [];
  }
}

/** Navigation: home + admin-managed category order (+ archive). */
async function getMenu(): Promise<MenuItem[]> {
  try {
    const cats = await withDbRetry(() =>
      db.category.findMany({
        orderBy: [{ order: "asc" }, { name: "asc" }],
      })
    );
    return [
      { label: "صفحه اصلی", href: "/", current: true },
      ...cats.map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
      { label: "همه اخبار", href: "/all-post" },
    ];
  } catch (err) {
    console.error("[cms] menu query failed:", err);
    return [{ label: "صفحه اصلی", href: "/", current: true }];
  }
}

/**
 * Static (non-post) blocks reproduced verbatim from the live reference site:
 * market ticker wiring, social links, newsletter texts and footer about.
 * The ticker itself is intentionally left untouched (per client decision).
 */
const SOCIAL_LINKS: HomepageData["sections"]["social"]["links"] = [
  { network: "facebook", label: "Facebook", href: "https://www.facebook.com/share/15Yx3THCSY/" },
  { network: "twitter", label: "X (Twitter)", href: "https://x.com/Petrotimes_ir" },
  { network: "youtube", label: "YouTube", href: "https://youtube.com/@petrotimes_ir" },
  { network: "telegram", label: "Telegram", href: "https://t.me/petrotimes_ir" },
  { network: "instagram", label: "Instagram", href: "https://Instagram.com/Petrotimes.ir" },
];

const NEWSLETTER: HomepageData["sections"]["newsletter"] = {
  heading: "Subscribe to Updates",
  text: "Get the latest creative news from FooBar about art, design and business.",
  placeholder: "Your email address..",
  button: "Subscribe",
  disclaimer: "By signing up, you agree to the our terms and our",
  disclaimerLink: "/privacy",
};

/** The brand-static newsletter block, reused by the inner-page sidebar. */
export const newsletterBlock = NEWSLETTER;

const FOOTER_ABOUT: HomepageData["sections"]["footer"]["about"] = {
  heading: "درباره ما",
  text: "مرجع تخصصی اخبار نفت، گاز، پتروشیمی و اقتصاد انرژی؛ تحلیل داده‌محور نوسانات بازار را در petrotimes.ir دنبال کنید.",
  emailHtml: { bold: "Email Us:", rest: " info@petrotimes.ir" },
};

/**
 * Builds the complete HomepageData from the CMS.
 * Individual failures degrade gracefully (empty slot arrays) — a single
 * broken query never takes the whole homepage down; the caller additionally
 * keeps the last fully-successful payload in memory.
 */
export async function buildHomepageData(): Promise<HomepageData> {
  const [hero, videos, topnews, magazine, feature, energy, advertise, mostViewed, latest, menu] =
    await Promise.all([
      getSectionPosts("hero"),
      getSectionPosts("videos"),
      getSectionPosts("topnews"),
      getSectionPosts("magazine"),
      getSectionPosts("feature"),
      getSectionPosts("energy"),
      getSectionPosts("advertise"),
      getMostViewed(4),
      getLatest(4),
      getMenu(),
    ]);

  const snapshot = getSnapshot();

  return {
    header: { menu },
    // Ticker wiring stays exactly as the live site (client decision: untouched).
    ticker: snapshot.ticker,
    sections: {
      heroMain: hero[0] ?? snapshot.sections.heroMain,
      heroSecondary: hero.slice(1, 5),
      tvPlayer: videos[0] ?? snapshot.sections.tvPlayer,
      tvPlaylist: videos.slice(1, 6),
      topNewsLabel: { label: "top news", article: topnews[0] ?? snapshot.sections.topNewsLabel.article },
      topNewsItems: topnews.slice(1, 4),
      magazine: { label: "magazine", articles: magazine.slice(0, 5) },
      featureTitle: {
        label: "feature title",
        items: feature.slice(0, 3).map((a, i) => toFeatureArticle(a, i)),
      },
      energyMain: energy[0] ?? snapshot.sections.energyMain,
      energySubs: energy.slice(1, 3),
      energyGrid: energy.slice(3, 6),
      social: { label: "we are social", links: SOCIAL_LINKS },
      newsletter: NEWSLETTER,
      advertise: { label: "advertise", items: advertise.slice(0, 2) },
      footer: {
        about: FOOTER_ABOUT,
        popularHeading: "بیشترین بازدید روز",
        latestHeading: "اخرین اخبار",
        popular: mostViewed.slice(0, 4),
        latest: latest.slice(0, 4),
        copyright: "حق نشر © 2026 Petro Times",
      },
      offcanvas: { whatsHot: mostViewed.slice(0, 4) },
    },
  };
}
