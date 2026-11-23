import { latestPostUpdatedAt } from "@/lib/seo/queries";
import { escXml, w3cDate, xmlDecl, XML_CONTENT_TYPE } from "@/lib/seo/xml";
import { siteUrl } from "@/lib/site";

/**
 * Static "page" sitemap (Rank Math scheme) — the home page and the fixed
 * non-post pages. lastmod is only emitted where real content changes
 * (home / همه اخبار follow the newest post).
 */

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const lastmod = await latestPostUpdatedAt();
  const lastmodTag = lastmod ? `<lastmod>${w3cDate(lastmod)}</lastmod>` : "";

  const entries: { loc: string; lastmod: boolean }[] = [
    { loc: `${siteUrl}/`, lastmod: true },
    { loc: `${siteUrl}/all-post`, lastmod: true },
    { loc: `${siteUrl}/about`, lastmod: false },
    { loc: `${siteUrl}/contact`, lastmod: false },
    { loc: `${siteUrl}/privacy`, lastmod: false },
  ];

  const xml = [
    xmlDecl(),
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(
      (e) =>
        `  <url><loc>${escXml(e.loc)}</loc>${e.lastmod ? lastmodTag : ""}</url>`
    ),
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: { "Content-Type": XML_CONTENT_TYPE },
  });
}
