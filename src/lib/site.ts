// Site-wide constants used for SEO, canonical URLs and absolute links.
// Brand is configurable via env so the same codebase can power any news site.
// Defaults below = Petro Times (petrotimes.ir).

export const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "پترو تایمز";
export const siteNameEn = process.env.NEXT_PUBLIC_SITE_NAME_EN ?? "Petro Times";
export const siteTagline =
  process.env.NEXT_PUBLIC_SITE_TAGLINE ?? "مرجع تخصصی اخبار نفت، گاز و انرژی";
export const siteDescription =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ??
  "پتروتایمز؛ مرجع تخصصی اخبار نفت، گاز، انرژی و اقتصاد ایران و جهان. آخرین تحلیل‌ها، گزارش‌ها و رویدادهای روز بازار انرژی را در Petrotimes دنبال کنید.";
export const siteKeywords = (
  process.env.NEXT_PUBLIC_SITE_KEYWORDS ??
  "پترو تایمز,Petro Times,petrotimes,petrotimes.ir,اخبار نفت,قیمت نفت,بازار نفت,گاز,گاز طبیعی,پتروشیمی,انرژی,اقتصاد انرژی,بورس انرژی,اوپک,پالایش و پخش"
).split(",");

export const siteEmail = process.env.NEXT_PUBLIC_SITE_EMAIL ?? "info@petrotimes.ir";

/** Editorial byline used when a post has no dedicated author (JSON-LD Person,
 * twitter:label1, dc:creator in the RSS feed). */
export const siteAuthor =
  process.env.NEXT_PUBLIC_SITE_AUTHOR ?? "تحریریه پترو تایمز";

/** X (Twitter) handle for twitter:site — without @ in the env, rendered with one. */
export const siteTwitterHandle = (
  process.env.NEXT_PUBLIC_SITE_TWITTER_HANDLE ?? "@Petrotimes_ir"
).replace(/^@?(.*)$/, "@$1");

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://petrotimes.ir"
).replace(/\/$/, "");

/** Official social profiles (used in JSON-LD sameAs + footer widgets). */
export const siteSocials = [
  "https://x.com/Petrotimes_ir",
  "https://www.facebook.com/share/15Yx3THCSY/",
  "https://t.me/petrotimes_ir",
  "https://youtube.com/@petrotimes_ir",
  "https://Instagram.com/Petrotimes.ir",
];

/** Turns a path (or already-absolute URL) into an absolute site URL.
 *  SEO-only consumers (canonical, og:, JSON-LD, sitemap, RSS) — anything
 *  rendered as a clickable link or <img> in the visitor's HTML must stay
 *  RELATIVE (see relUrl below): behind proxies/preview panels the origin
 *  seen by the browser is not siteUrl, and absolute hrefs would navigate
 *  the user off the rendered site ("clicking a news item does nothing"). */
export function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Relative URL for HTML hrefs / img src: already-absolute URLs (external
 *  banners, remote media) pass through untouched, app paths stay app paths. */
export function relUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export function postUrl(slug: string): string {
  return `${siteUrl}/news/${slug}`;
}

/** RSS feed link for metadata.alternates.types — pages that set their own
 * canonical must repeat this because Next.js does not merge alternates
 * between layout and page. */
export const rssAlternates = {
  types: {
    "application/rss+xml": `${siteUrl}/feed.xml`,
  },
} as const;
