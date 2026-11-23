/**
 * SEO data queries — the single data layer for sitemap.xml (index),
 * post/page/category/tag sitemaps, news-sitemap.xml and feed.xml.
 *
 * Rules (mirroring queries.ts):
 *  - Only PUBLISHED posts with publishedAt in the past AND hasOwnPage=true
 *    are listed — every sitemap URL must resolve on its own page.
 *  - Every query degrades gracefully: a DB failure yields an empty list so
 *    the sitemap/feed endpoint never 500s.
 */

import { db } from "@/lib/db";
import { absoluteUrl, postUrl } from "@/lib/site";

export const SITEMAP_POSTS_PER_PAGE = 1000;
export const NEWS_SITEMAP_WINDOW_HOURS = 48;
export const NEWS_SITEMAP_LIMIT = 1000;
export const FEED_ITEM_LIMIT = 20;

const publishedWhere = () => ({
  status: "PUBLISHED" as const,
  publishedAt: { lte: new Date() },
  hasOwnPage: true,
});

const mediaUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return absoluteUrl(url);
};

/* ------------------------------------------------------------- sitemaps --- */

export async function countPublishedPosts(): Promise<number> {
  try {
    return await db.post.count({ where: publishedWhere() });
  } catch (err) {
    console.error("[seo-queries] countPublishedPosts failed:", err);
    return 0;
  }
}

/** Newest modification date among published posts — sitemap index lastmod. */
export async function latestPostUpdatedAt(): Promise<Date | null> {
  try {
    const p = await db.post.findFirst({
      where: publishedWhere(),
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    return p?.updatedAt ?? null;
  } catch (err) {
    console.error("[seo-queries] latestPostUpdatedAt failed:", err);
    return null;
  }
}

export interface SitemapEntry {
  loc: string;
  lastmod: Date;
  imageUrl?: string | null;
  imageTitle?: string | null;
}

export async function listPostsForSitemap(page: number): Promise<SitemapEntry[]> {
  try {
    const posts = await db.post.findMany({
      where: publishedWhere(),
      orderBy: { updatedAt: "desc" },
      skip: Math.max(0, (page - 1) * SITEMAP_POSTS_PER_PAGE),
      take: SITEMAP_POSTS_PER_PAGE,
      select: {
        slug: true,
        updatedAt: true,
        homeImage: { select: { url: true, alt: true } },
      },
    });
    return posts.map((p) => ({
      loc: postUrl(p.slug),
      lastmod: p.updatedAt,
      imageUrl: mediaUrl(p.homeImage?.url),
      imageTitle: p.homeImage?.alt || null,
    }));
  } catch (err) {
    console.error("[seo-queries] listPostsForSitemap failed:", err);
    return [];
  }
}

export interface TaxonomySitemapEntry {
  name: string;
  loc: string;
  lastmod: Date | null;
}

export async function listCategoriesForSitemap(): Promise<TaxonomySitemapEntry[]> {
  try {
    const cats = await db.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        name: true,
        slug: true,
        posts: {
          where: publishedWhere(),
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { updatedAt: true },
        },
      },
    });
    return cats.map((c) => ({
      name: c.name,
      loc: absoluteUrl(`/category/${c.slug}`),
      lastmod: c.posts[0]?.updatedAt ?? null,
    }));
  } catch (err) {
    console.error("[seo-queries] listCategoriesForSitemap failed:", err);
    return [];
  }
}

export async function listTagsForSitemap(): Promise<TaxonomySitemapEntry[]> {
  try {
    const tags = await db.tag.findMany({
      where: { posts: { some: { post: publishedWhere() } } },
      orderBy: { name: "asc" },
      select: {
        name: true,
        slug: true,
        posts: {
          where: { post: publishedWhere() },
          orderBy: { post: { updatedAt: "desc" } },
          take: 1,
          select: { post: { select: { updatedAt: true } } },
        },
      },
    });
    return tags.map((t) => ({
      name: t.name,
      loc: absoluteUrl(`/tag/${t.slug}`),
      lastmod: t.posts[0]?.post.updatedAt ?? null,
    }));
  } catch (err) {
    console.error("[seo-queries] listTagsForSitemap failed:", err);
    return [];
  }
}

/* -------------------------------------------------------- news sitemap --- */

export interface NewsSitemapEntry {
  loc: string;
  title: string;
  publishedAt: Date;
  lastmod: Date;
  imageUrl: string | null;
}

export async function listNewsSitemapEntries(): Promise<NewsSitemapEntry[]> {
  const windowStart = new Date(Date.now() - NEWS_SITEMAP_WINDOW_HOURS * 3600_000);
  try {
    const posts = await db.post.findMany({
      where: { ...publishedWhere(), publishedAt: { gte: windowStart } },
      orderBy: { publishedAt: "desc" },
      take: NEWS_SITEMAP_LIMIT,
      select: {
        slug: true,
        title: true,
        publishedAt: true,
        updatedAt: true,
        homeImage: { select: { url: true } },
      },
    });
    return posts.map((p) => ({
      loc: postUrl(p.slug),
      title: p.title,
      publishedAt: p.publishedAt,
      lastmod: p.updatedAt,
      imageUrl: mediaUrl(p.homeImage?.url),
    }));
  } catch (err) {
    console.error("[seo-queries] listNewsSitemapEntries failed:", err);
    return [];
  }
}

/* ---------------------------------------------------------------- feed --- */

export interface FeedItem {
  slug: string;
  title: string;
  lead: string;
  body: string;
  publishedAt: Date;
  updatedAt: Date;
  categoryName: string | null;
  tags: string[];
  imageUrl: string | null;
  imageAlt: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
}

export async function listFeedItems(limit = FEED_ITEM_LIMIT): Promise<FeedItem[]> {
  try {
    const posts = await db.post.findMany({
      where: publishedWhere(),
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        slug: true,
        title: true,
        lead: true,
        body: true,
        publishedAt: true,
        updatedAt: true,
        category: { select: { name: true } },
        tags: { select: { tag: { select: { name: true } } } },
        homeImage: { select: { url: true, alt: true, width: true, height: true } },
      },
    });
    return posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      lead: p.lead,
      body: p.body,
      publishedAt: p.publishedAt,
      updatedAt: p.updatedAt,
      categoryName: p.category?.name ?? null,
      tags: p.tags.map((t) => t.tag.name),
      imageUrl: mediaUrl(p.homeImage?.url),
      imageAlt: p.homeImage?.alt || null,
      imageWidth: p.homeImage?.width ?? null,
      imageHeight: p.homeImage?.height ?? null,
    }));
  } catch (err) {
    console.error("[seo-queries] listFeedItems failed:", err);
    return [];
  }
}
