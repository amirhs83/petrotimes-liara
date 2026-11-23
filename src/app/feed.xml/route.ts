import { listFeedItems } from "@/lib/seo/queries";
import { cdata, escXml, rfc822Date, xmlDecl } from "@/lib/seo/xml";
import { siteAuthor, siteDescription, siteName, siteUrl, postUrl } from "@/lib/site";

/**
 * RSS 2.0 feed (WordPress/Rank Math parity) — the /feed.xml the layouts
 * already advertise via <link rel="alternate" type="application/rss+xml">.
 *
 * Namespaces exactly like the WordPress feed:
 *   content:  content:encoded (full sanitized body)
 *   dc:       dc:creator (editorial byline)
 *   media:    media:content / media:title (hero image)
 *   atom:     atom:link rel="self"
 *
 * A <generator> tag is deliberately NOT emitted (same decision as the site).
 */

export const dynamic = "force-dynamic";

const NS =
  'xmlns:content="http://purl.org/rss/1.0/modules/content/" ' +
  'xmlns:wfw="http://wellformedweb.org/CommentAPI/" ' +
  'xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
  'xmlns:atom="http://www.w3.org/2005/Atom" ' +
  'xmlns:sy="http://purl.org/rss/1.0/modules/syndication/" ' +
  'xmlns:media="http://search.yahoo.com/mrss/"';

const FEED_LIMIT = 20;

export async function GET(): Promise<Response> {
  const items = await listFeedItems(FEED_LIMIT);
  const buildDate = items.length
    ? rfc822Date(new Date(items[0].publishedAt))
    : rfc822Date(new Date());

  const channel = [
    xmlDecl(),
    `<rss version="2.0" ${NS}>`,
    "  <channel>",
    `    <title>${escXml(siteName)}</title>`,
    `    <atom:link href="${escXml(`${siteUrl}/feed.xml`)}" rel="self" type="application/rss+xml" />`,
    `    <link>${escXml(siteUrl)}</link>`,
    `    <description>${escXml(siteDescription)}</description>`,
    `    <lastBuildDate>${buildDate}</lastBuildDate>`,
    "    <language>fa-IR</language>",
    `    <sy:updatePeriod>hourly</sy:updatePeriod>`,
    "    <sy:updateFrequency>1</sy:updateFrequency>",
  ];

  const itemXml = items.map((p) => {
    const link = postUrl(p.slug);
    const categories = [
      ...(p.categoryName ? [p.categoryName] : []),
      ...p.tags,
    ]
      .map((c) => `    <category>${cdata(c)}</category>`)
      .join("\n");

    const media = p.imageUrl
      ? [
          `    <media:content url="${escXml(p.imageUrl)}" medium="image"${
            p.imageWidth && p.imageHeight
              ? ` width="${p.imageWidth}" height="${p.imageHeight}"`
              : ""
          }>`,
          `      <media:title type="text/plain">${cdata(p.imageAlt || p.title)}</media:title>`,
          "    </media:content>",
        ].join("\n")
      : "";

    return [
      "    <item>",
      `      <title>${cdata(p.title)}</title>`,
      `      <link>${escXml(link)}</link>`,
      `      <pubDate>${rfc822Date(new Date(p.publishedAt))}</pubDate>`,
      `      <dc:creator>${cdata(siteAuthor)}</dc:creator>`,
      `      <guid isPermaLink="false">${escXml(p.slug)}</guid>`,
      `      <description>${cdata(p.lead)}</description>`,
      `      <content:encoded>${cdata(p.body)}</content:encoded>`,
      ...(categories ? [categories] : []),
      ...(media ? [media] : []),
      "    </item>",
    ].join("\n");
  });

  const xml = [...channel, ...itemXml, "  </channel>", "</rss>", ""].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
