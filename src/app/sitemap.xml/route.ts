import {
  SITEMAP_POSTS_PER_PAGE,
  countPublishedPosts,
  latestPostUpdatedAt,
} from "@/lib/seo/queries";
import { w3cDate, xmlDecl, XML_CONTENT_TYPE } from "@/lib/seo/xml";
import { siteUrl } from "@/lib/site";

/**
 * Sitemap index (Rank Math URL scheme) — lists the child sitemaps:
 *   /post-sitemap1.xml … /post-sitemapN.xml (paginated, 1000 URLs each)
 *   /page-sitemap.xml
 *   /category-sitemap.xml
 *   /post-tag-sitemap.xml
 *   /news-sitemap.xml (Google News, 48h window)
 *
 * Always rendered at request time so a newly published post appears in the
 * index within seconds.
 */

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const [count, lastmod] = await Promise.all([
    countPublishedPosts(),
    latestPostUpdatedAt(),
  ]);
  const postPages = Math.max(1, Math.ceil(count / SITEMAP_POSTS_PER_PAGE));

  const entries: { loc: string; lastmod: Date | null }[] = [];
  for (let i = 1; i <= postPages; i++) {
    entries.push({ loc: `${siteUrl}/post-sitemap${i}.xml`, lastmod });
  }
  entries.push(
    { loc: `${siteUrl}/page-sitemap.xml`, lastmod: null },
    { loc: `${siteUrl}/category-sitemap.xml`, lastmod },
    { loc: `${siteUrl}/post-tag-sitemap.xml`, lastmod },
    { loc: `${siteUrl}/news-sitemap.xml`, lastmod: null }
  );

  const xml = [
    xmlDecl(),
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(
      (e) =>
        `  <sitemap><loc>${e.loc}</loc>${
          e.lastmod ? `<lastmod>${w3cDate(e.lastmod)}</lastmod>` : ""
        }</sitemap>`
    ),
    "</sitemapindex>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: { "Content-Type": XML_CONTENT_TYPE },
  });
}
