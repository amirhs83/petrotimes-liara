/**
 * XML serialization helpers for the sitemap set and the RSS feed.
 * Every sitemap/feed route must emit well-formed XML even when titles or
 * leads contain special characters, so all text goes through escaping or
 * CDATA-wrapping here.
 */

export function escXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Wrap text in CDATA, splitting any "]]>" occurrence so it stays valid. */
export function cdata(text: string): string {
  return `<![CDATA[${String(text ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/** W3C datetime (sitemap lastmod / news:publication_date). */
export function w3cDate(d: Date): string {
  return d.toISOString();
}

/** RFC-822 date (RSS pubDate / lastBuildDate), e.g. "Thu, 01 Jan 2026 09:30:00 GMT". */
export function rfc822Date(d: Date): string {
  return d.toUTCString();
}

export function xmlDecl(): string {
  return '<?xml version="1.0" encoding="UTF-8"?>';
}

export const XML_CONTENT_TYPE = "application/xml; charset=utf-8";
