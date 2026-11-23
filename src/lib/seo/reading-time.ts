/**
 * Reading-time / word-count helpers for the SEO layer.
 *
 * Feeds twitter:label2 («زمان مطالعه») and schema.org NewsArticle.wordCount.
 * Persian is read at roughly 200 words per minute (the same figure the
 * common WordPress reading-time plugins use) — the minimum is 1 minute.
 */

const WORDS_PER_MINUTE = 200;

const HTML_TAG_RE = /<[^>]*>/g;
const BLOCK_TAG_RE = /<\/?(p|div|h[1-6]|li|blockquote|figure|figcaption|br|tr)[^>]*>/gi;

export function htmlToText(html: string): string {
  return html
    .replace(BLOCK_TAG_RE, " ")
    .replace(HTML_TAG_RE, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(html: string): number {
  const text = htmlToText(html);
  if (!text) return 0;
  return text.split(/\s+/).length;
}

/** Whole reading minutes, minimum 1. */
export function readingMinutes(html: string): number {
  return Math.max(1, Math.round(countWords(html) / WORDS_PER_MINUTE));
}
