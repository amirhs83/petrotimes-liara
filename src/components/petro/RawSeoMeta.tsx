/**
 * Raw SEO meta tags the Next.js Metadata API cannot express — React 19
 * hoists these <meta> elements into <head> automatically and de-duplicates
 * them by name/property.
 *
 *  - og:image:secure_url      Rank Math emits it next to og:image
 *  - og:updated_time          Rank Math emits it next to article:modified_time
 *  - twitter:label1/data1     نویسنده (editorial byline)
 *  - twitter:label2/data2     زمان مطالعه (reading time, Persian digits)
 *
 * These components are page-scoped: the homepage renders the default-image
 * secure_url, article pages render their own — never both on one page.
 */

export function OgImageSecureUrl({ url }: { url: string }) {
  return <meta property="og:image:secure_url" content={url} />;
}

export function OgUpdatedTime({ iso }: { iso: string }) {
  return <meta property="og:updated_time" content={iso} />;
}

export function TwitterMetaLabels({
  author,
  data2,
}: {
  author: string;
  data2: string;
}) {
  return (
    <>
      <meta name="twitter:label1" content="نویسنده" />
      <meta name="twitter:data1" content={author} />
      <meta name="twitter:label2" content="زمان مطالعه" />
      <meta name="twitter:data2" content={data2} />
    </>
  );
}
