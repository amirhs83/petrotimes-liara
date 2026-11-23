import { listTagsForSitemap } from "@/lib/seo/queries";
import { escXml, w3cDate, xmlDecl, XML_CONTENT_TYPE } from "@/lib/seo/xml";

/** Tag archive sitemap (Rank Math scheme) — tags that have published posts. */

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const tags = await listTagsForSitemap();

  const xml = [
    xmlDecl(),
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...tags.map(
      (t) =>
        `  <url><loc>${escXml(t.loc)}</loc>${
          t.lastmod ? `<lastmod>${w3cDate(t.lastmod)}</lastmod>` : ""
        }</url>`
    ),
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: { "Content-Type": XML_CONTENT_TYPE },
  });
}
