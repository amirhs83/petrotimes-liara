import { SITEMAP_POSTS_PER_PAGE, listPostsForSitemap } from "@/lib/seo/queries";
import { escXml, w3cDate, xmlDecl, XML_CONTENT_TYPE } from "@/lib/seo/xml";

/**
 * Paginated post sitemap backend — served at /post-sitemap/{n}, but crawled
 * under the Rank Math URL scheme /post-sitemap{n}.xml via the transparent
 * rewrite in src/proxy.ts (the browser-visible URL stays /post-sitemap1.xml).
 *
 * 1000 URLs per file with the sitemap image extension for the hero image
 * (mirrors the WordPress/Rank Math post sitemap output). Out-of-range or
 * invalid pages return a valid empty urlset instead of a 404, so the index
 * can never point to a missing file.
 */

export const dynamic = "force-dynamic";

const IMAGE_NS = 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';

type Props = { params: Promise<{ page: string }> };

export async function GET(_req: Request, { params }: Props): Promise<Response> {
  const { page } = await params;
  const n = parseInt(page, 10);

  const entries = Number.isFinite(n) && n >= 1 ? await listPostsForSitemap(n) : [];

  const urls = entries
    .map((e) => {
      const image = e.imageUrl
        ? `\n    <image:image><image:loc>${escXml(e.imageUrl)}</image:loc>${
            e.imageTitle ? `<image:title>${escXml(e.imageTitle)}</image:title>` : ""
          }</image:image>\n`
        : "";
      return [
        "  <url>",
        `    <loc>${escXml(e.loc)}</loc>`,
        `    <lastmod>${w3cDate(e.lastmod)}</lastmod>${image}`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    xmlDecl(),
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ${IMAGE_NS}>`,
    urls,
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: { "Content-Type": XML_CONTENT_TYPE },
  });
}
