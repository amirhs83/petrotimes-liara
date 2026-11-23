/**
 * Public read queries — the data layer behind every inner page
 * (/news/[slug], /category/[slug], /tag/[slug], /all-post, /search).
 *
 * Rules (mirroring cms.ts):
 *  - Only PUBLISHED posts with publishedAt in the past are ever returned.
 *  - hasOwnPage=false posts exist only as homepage cards — they never
 *    resolve on their own page.
 *  - Persian pagination numbers and Jalali dates are produced server-side.
 *  - Every query degrades gracefully (catch → empty result), never throws
 *    to the page: a broken query must render an empty state, not a 500.
 */

import { db, withDbRetry } from "@/lib/db";
import { containsInsensitive } from "@/lib/db-text";
import { faDateLong, faTime } from "@/lib/post-format";
import { absoluteUrl, relUrl } from "@/lib/site";
import type { Article } from "./types";

export interface MediaRef {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface FullPost {
  id: string;
  slug: string;
  categoryId: string;
  kicker: string | null;
  title: string;
  lead: string;
  body: string;
  homeImage: MediaRef | null;
  innerImage: MediaRef | null;
  ogImage: MediaRef | null;
  videoType: "NONE" | "UPLOAD" | "APARAT" | "YOUTUBE";
  videoUrl: string | null;
  videoDuration: number | null;
  category: { name: string; slug: string };
  tags: { tag: { name: string; slug: string } }[];
  views: number;
  publishedAt: Date;
  updatedAt: Date;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  canonicalUrl: string | null;
}

export interface ArchiveItem {
  slug: string;
  title: string;
  lead: string;
  image: string | null;
  dateText: string;
  category: { name: string; slug: string };
  views: number;
}

export interface Paged<T> {
  items: T[];
  page: number;
  totalPages: number;
  totalItems: number;
}

const PAGE_SIZE = 10;
export const ARCHIVE_PAGE_SIZE = PAGE_SIZE;

const publishedWhere = () => ({
  status: "PUBLISHED" as const,
  publishedAt: { lte: new Date() },
  hasOwnPage: true,
});

/** HTML-src media URLs stay app-relative (relUrl) — see site.ts note. */
function mediaUrl(url: string | null | undefined): string | null {
  return relUrl(url);
}

/** Public helper for pages that need absolute media URLs (OG tags, JSON-LD).
 *  Metadata is consumed by crawlers/other clients, not by this visitor's
 *  browser — absolute site URLs are correct (and required) there. */
export function absolutizeMedia(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return absoluteUrl(url.startsWith("/") ? url : `/${url}`);
}

/** Prisma post (with includes) → homepage Article contract. */
export function toArticle(p: {
  slug: string;
  title: string;
  lead: string;
  kicker: string | null;
  publishedAt: Date;
  category: { name: string; slug: string } | null;
  homeImage?: { url: string } | null;
}): Article {
  const image = mediaUrl(p.homeImage?.url);
  return {
    title: p.title,
    // relative HTML href — absolute URLs break proxied/preview navigation
    url: `/news/${encodeURIComponent(p.slug)}`,
    dateText: `${faDateLong(new Date(p.publishedAt))} - ${faTime(new Date(p.publishedAt))}`,
    category: p.category?.name ?? null,
    categoryUrl: p.category ? `/category/${p.category.slug}` : null,
    excerpt: p.lead || null,
    image,
    imageFull: image,
    eyebrow: p.kicker,
  };
}

function toArchiveItem(p: {
  slug: string;
  title: string;
  lead: string;
  views: number;
  publishedAt: Date;
  category: { name: string; slug: string } | null;
  homeImage?: { url: string } | null;
}): ArchiveItem {
  return {
    slug: p.slug,
    title: p.title,
    lead: p.lead,
    image: mediaUrl(p.homeImage?.url),
    dateText: `${faDateLong(new Date(p.publishedAt))} - ${faTime(new Date(p.publishedAt))}`,
    category: p.category ?? { name: "", slug: "" },
    views: p.views,
  };
}

const archiveInclude = {
  category: { select: { name: true, slug: true } },
  homeImage: { select: { url: true } },
} as const;

const archiveOrderBy = [{ publishedAt: "desc" } as const];

// ---------------------------------------------------------------- post ---

export async function getPostBySlug(slug: string): Promise<FullPost | null> {
  // withDbRetry: a transient SQLite lock (e.g. during a seed/admin write)
  // must never surface as null → notFound() → ISR-cached 404.
  try {
    const p = await withDbRetry(() =>
      db.post.findFirst({
        where: { slug, ...publishedWhere() },
        select: {
          id: true,
          slug: true,
          categoryId: true,
          kicker: true,
          title: true,
          lead: true,
          body: true,
          homeImage: { select: { url: true, alt: true, width: true, height: true } },
          innerImage: { select: { url: true, alt: true, width: true, height: true } },
          ogImage: { select: { url: true, alt: true, width: true, height: true } },
          videoType: true,
          videoUrl: true,
          videoDuration: true,
          views: true,
          publishedAt: true,
          updatedAt: true,
          metaTitle: true,
          metaDescription: true,
          metaKeywords: true,
          canonicalUrl: true,
          category: { select: { name: true, slug: true } },
          tags: { select: { tag: { select: { name: true, slug: true } } } },
        },
      })
    );
    return (p as FullPost) ?? null;
  } catch (err) {
    console.error("[queries] getPostBySlug failed:", err);
    return null;
  }
}

/** Latest posts of the article's main category (related-news block). */
export async function getRelatedPosts(
  categoryId: string,
  excludeId: string,
  limit = 4
): Promise<Article[]> {
  try {
    const posts = await withDbRetry(() =>
      db.post.findMany({
        where: {
          ...publishedWhere(),
          categoryId,
          id: { not: excludeId },
        },
        orderBy: archiveOrderBy,
        take: limit,
        include: archiveInclude,
      })
    );
    return posts.map(toArticle);
  } catch (err) {
    console.error("[queries] getRelatedPosts failed:", err);
    return [];
  }
}

// ------------------------------------------------------------- archive ---

async function pagedFind(
  where: Parameters<typeof db.post.findMany>[0] extends never ? never : Record<string, unknown>,
  page: number,
  orderBy: Record<string, unknown>[] = [{ publishedAt: "desc" }]
): Promise<Paged<ArchiveItem>> {
  const safePage = Math.max(1, page);
  const [count, posts] = await withDbRetry(() =>
    Promise.all([
      db.post.count({ where }),
      db.post.findMany({
        where,
        orderBy,
        skip: (safePage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: archiveInclude,
      }),
    ])
  );
  return {
    items: posts.map(toArchiveItem),
    page: safePage,
    totalPages: Math.max(1, Math.ceil(count / PAGE_SIZE)),
    totalItems: count,
  };
}

/** Wrap a paged query so a DB failure renders an empty archive, not a 500. */
async function safePaged(
  run: () => Promise<Paged<ArchiveItem>>
): Promise<Paged<ArchiveItem>> {
  try {
    return await run();
  } catch (err) {
    console.error("[queries] archive query failed:", err);
    return { items: [], page: 1, totalPages: 1, totalItems: 0 };
  }
}

export async function getCategoryBySlug(
  slug: string
): Promise<{ id: string; name: string; slug: string } | null> {
  try {
    return await withDbRetry(() =>
      db.category.findUnique({
        where: { slug },
        select: { id: true, name: true, slug: true },
      })
    );
  } catch (err) {
    console.error("[queries] getCategoryBySlug failed:", err);
    return null;
  }
}

export async function getCategoryPosts(
  categoryId: string,
  page: number
): Promise<Paged<ArchiveItem>> {
  return safePaged(() => pagedFind({ ...publishedWhere(), categoryId }, page));
}

export async function getAllPosts(page: number): Promise<Paged<ArchiveItem>> {
  return safePaged(() => pagedFind({ ...publishedWhere() }, page));
}

export async function getTagBySlug(
  slug: string
): Promise<{ id: string; name: string; slug: string } | null> {
  try {
    return await withDbRetry(() =>
      db.tag.findUnique({
        where: { slug },
        select: { id: true, name: true, slug: true },
      })
    );
  } catch (err) {
    console.error("[queries] getTagBySlug failed:", err);
    return null;
  }
}

export async function getTagPosts(
  tagId: string,
  page: number
): Promise<Paged<ArchiveItem>> {
  return safePaged(() =>
    pagedFind(
      { ...publishedWhere(), tags: { some: { tagId } } },
      page
    )
  );
}

// -------------------------------------------------------------- search ---

/**
 * Search across title / lead / body.
 *
 * Strategy: AND across the query's words, each word matched with an OR of
 * insensitive `contains` over the three fields. Works identically on the
 * local SQLite dev database and the production PostgreSQL (no tsvector
 * dependency — Persian full-text dictionaries don't stem Persian anyway).
 * Ordering is by publish date (WordPress default), paginated at DB level.
 */
export function splitQuery(q: string): string[] {
  return q
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2)
    .slice(0, 8);
}

export async function searchPosts(
  query: string,
  page: number
): Promise<Paged<ArchiveItem>> {
  const words = splitQuery(query);
  if (words.length === 0) {
    return { items: [], page: 1, totalPages: 1, totalItems: 0 };
  }
  const wordWhere = words.map((w) => ({
    OR: [
      { title: containsInsensitive(w) },
      { lead: containsInsensitive(w) },
      { body: containsInsensitive(w) },
    ],
  }));
  return safePaged(() =>
    pagedFind({ AND: wordWhere, ...publishedWhere() }, page)
  );
}

// ------------------------------------------------------------ sidebar ---

/** Sidebar widgets for inner pages — automatic latest + most-viewed. */
export async function getSidebarArticles(
  limit = 5
): Promise<{ latest: Article[]; mostRead: Article[] }> {
  try {
    const [latest, mostRead] = await withDbRetry(() =>
      Promise.all([
        db.post.findMany({
          where: publishedWhere(),
          orderBy: { publishedAt: "desc" },
          take: limit,
          include: archiveInclude,
        }),
        db.post.findMany({
          where: publishedWhere(),
          orderBy: [{ views: "desc" }, { publishedAt: "desc" }],
          take: limit,
          include: archiveInclude,
        }),
      ])
    );
    return { latest: latest.map(toArticle), mostRead: mostRead.map(toArticle) };
  } catch (err) {
    console.error("[queries] getSidebarArticles failed:", err);
    return { latest: [], mostRead: [] };
  }
}
