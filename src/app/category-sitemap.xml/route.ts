import { listCategoriesForSitemap } from "@/lib/seo/queries";
import { escXml, w3cDate, xmlDecl, XML_CONTENT_TYPE } from "@/lib/seo/xml";

/** Category archive sitemap (Rank Math scheme) — one URL per category. */

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const categories = await listCategoriesForSitemap();

  const xml = [
    xmlDecl(),
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...categories.map(
      (c) =>
        `  <url><loc>${escXml(c.loc)}</loc>${
          c.lastmod ? `<lastmod>${w3cDate(c.lastmod)}</lastmod>` : ""
        }</url>`
    ),
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: { "Content-Type": XML_CONTENT_TYPE },
  });
}
