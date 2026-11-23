import { listNewsSitemapEntries } from "@/lib/seo/queries";
import { escXml, w3cDate, xmlDecl, XML_CONTENT_TYPE } from "@/lib/seo/xml";
import { siteName } from "@/lib/site";

/**
 * Google News sitemap (Rank Math scheme) — posts published within the last
 * 48 hours (Google's window), news:publication name = site title, language
 * fa, plus the image extension for the hero image.
 */

export const dynamic = "force-dynamic";

const NEWS_NS =
  'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';

export async function GET(): Promise<Response> {
  const entries = await listNewsSitemapEntries();

  const urls = entries
    .map((e) => {
      const image = e.imageUrl
        ? `\n    <image:image><image:loc>${escXml(e.imageUrl)}</image:loc></image:image>`
        : "";
      return [
        "  <url>",
        `    <loc>${escXml(e.loc)}</loc>`,
        `    <lastmod>${w3cDate(e.lastmod)}</lastmod>`,
        "    <news:news>",
        "      <news:publication>",
        `        <news:name>${escXml(siteName)}</news:name>`,
        "        <news:language>fa</news:language>",
        "      </news:publication>",
        `      <news:publication_date>${w3cDate(e.publishedAt)}</news:publication_date>`,
        `      <news:title>${escXml(e.title)}</news:title>`,
        "    </news:news>" + image,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    xmlDecl(),
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ${NEWS_NS}>`,
    urls,
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: { "Content-Type": XML_CONTENT_TYPE },
  });
}
