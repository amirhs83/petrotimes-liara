import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPostBySlug,
  getRelatedPosts,
  getSidebarArticles,
  absolutizeMedia,
} from "@/lib/content/queries";
import { newsletterBlock } from "@/lib/content";
import { Breadcrumbs, SidebarWidgets } from "@/components/petro/Inner";
import { ViewCounter } from "@/components/petro/ViewCounter";
import { PostMeta } from "@/components/petro/Primitives";
import ShareRow from "@/components/petro/ShareRow";
import { JsonLd } from "@/components/petro/JsonLd";
import {
  OgImageSecureUrl,
  OgUpdatedTime,
  TwitterMetaLabels,
} from "@/components/petro/RawSeoMeta";
import { parseVideoEmbed } from "@/lib/video-embed";
import { faDigits, enDateLine } from "@/lib/post-format";
import { absoluteUrl, relUrl, rssAlternates, siteAuthor, siteName } from "@/lib/site";
import { articleGraph, articleBreadcrumbs } from "@/lib/seo/jsonld";
import { countWords, readingMinutes } from "@/lib/seo/reading-time";
import type { Article } from "@/lib/content/types";

// article pages are ISR-cached; new/edited posts go live within 60s
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

/* ------------------------------------------------------------------ SEO --- */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = await getPostBySlug(decodedSlug);
  // notFound() here (metadata phase) commits the real HTTP 404 status —
  // throwing only in the body would stream a 200 first (soft-404)
  if (!post) notFound();

  const canonical = post.canonicalUrl || absoluteUrl(`/news/${decodedSlug}`);
  const ogMedia = post.ogImage ?? post.innerImage ?? post.homeImage;
  const ogImage = absolutizeMedia(ogMedia?.url);
  const description = post.metaDescription || post.lead.slice(0, 160);
  const title = post.metaTitle || post.title;
  const publishedIso = new Date(post.publishedAt).toISOString();
  const modifiedIso = new Date(post.updatedAt).toISOString();

  return {
    title,
    description,
    keywords: post.metaKeywords ?? undefined,
    authors: [{ name: siteAuthor }],
    alternates: { canonical, types: rssAlternates.types },
    openGraph: {
      type: "article",
      locale: "fa_IR",
      url: canonical,
      siteName,
      title,
      description,
      publishedTime: publishedIso,
      modifiedTime: modifiedIso,
      authors: [siteAuthor],
      tags: post.tags.map((t) => t.tag.name),
      images: ogImage
        ? [
            {
              url: ogImage,
              alt: post.ogImage?.alt || post.homeImage?.alt || post.title,
              ...(ogMedia?.width && ogMedia?.height
                ? { width: ogMedia.width, height: ogMedia.height }
                : {}),
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

/* -------------------------------------------------------------- related --- */

/** related card — the standard small-post card (2-line clamp) */
function RelatedCard({ article }: { article: Article }) {
  return (
    <article className="pt-small-post pt-clamp">
      <div className="pt-media">
        <a href={article.url} className="pt-media-link" title={article.title} aria-label={article.title}>
          <span className="pt-media-ratio pt-ratio-thumb">
            <span
              className="pt-bg-cover"
              style={{ backgroundImage: `url("${article.image ?? ''}")`, position: 'absolute', top: 0, right: 0 } as React.CSSProperties}
            />
          </span>
        </a>
      </div>
      <div className="pt-content">
        <h3 className="pt-post-title">
          <a href={article.url}>{article.title}</a>
        </h3>
        <PostMeta category={null} categoryUrl={null} dateText={article.dateText} />
      </div>
    </article>
  );
}

/* ----------------------------------------------------------------- page --- */

/**
 * Single news page — the petrotimes design language applied to the article
 * view: breadcrumb trail, kicker, 25px title, Barlow meta row, lead, 16:9
 * hero figure, sanitized CMS body, tags chips, related grid and the shared
 * sidebar rail. Chrome/ticker/footer come from the (inner) layout.
 * Body HTML is pre-sanitized server-side on every save (sanitizePostBody) —
 * rendering it here is XSS-safe.
 */
export default async function NewsPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = await getPostBySlug(decodedSlug);
  if (!post) notFound();

  const [{ latest, mostRead }, related] = await Promise.all([
    getSidebarArticles(5),
    getRelatedPosts(post.categoryId, post.id, 4),
  ]);

  const heroImage = post.innerImage ?? post.homeImage;
  // browser-facing <img> src stays app-relative; metadata below stays absolute
  const heroImageSrc = relUrl(heroImage?.url);
  const published = new Date(post.publishedAt);

  const videoEmbed =
    post.videoType === "APARAT" || post.videoType === "YOUTUBE"
      ? post.videoUrl
        ? parseVideoEmbed(post.videoUrl)
        : null
      : null;

  const tags = post.tags.map((t) => t.tag);
  // share row rides on the canonical URL when one is set, so share targets
  // always match what crawlers index
  const shareUrl = post.canonicalUrl || absoluteUrl(`/news/${decodedSlug}`);

  /* SEO — article JSON-LD graph + the raw meta tags Next's Metadata API
     cannot express (og:image:secure_url, og:updated_time, twitter labels). */
  const ogMediaForLd = post.ogImage ?? post.innerImage ?? post.homeImage;
  const ogImageUrlForLd = absolutizeMedia(ogMediaForLd?.url);
  const keywords = [...tags.map((t) => t.name)];
  if (post.metaKeywords) {
    keywords.push(
      ...post.metaKeywords.split(",").map((k) => k.trim()).filter(Boolean)
    );
  }
  const articleCanonical = post.canonicalUrl || absoluteUrl(`/news/${decodedSlug}`);
  const jsonLd = articleGraph(
    {
      url: articleCanonical,
      headline: post.title,
      description: post.metaDescription || post.lead,
      publishedAt: new Date(post.publishedAt),
      modifiedAt: new Date(post.updatedAt),
      section: post.category.name,
      keywords,
      wordCount: countWords(post.body),
      image: ogImageUrlForLd
        ? {
            url: ogImageUrlForLd,
            alt: post.ogImage?.alt || post.homeImage?.alt || post.title,
            width: ogMediaForLd?.width ?? null,
            height: ogMediaForLd?.height ?? null,
          }
        : null,
      authorName: siteAuthor,
    },
    articleBreadcrumbs({
      title: post.title,
      category: { name: post.category.name, slug: post.category.slug },
    })
  );

  return (
    <div className="pt-section">
      <JsonLd graph={jsonLd} />
      {ogImageUrlForLd ? <OgImageSecureUrl url={ogImageUrlForLd} /> : null}
      <OgUpdatedTime iso={new Date(post.updatedAt).toISOString()} />
      <TwitterMetaLabels
        author={siteAuthor}
        data2={`${faDigits(readingMinutes(post.body))} دقیقه`}
      />
      <div className="pt-container">
        <div className="pt-columns">
          <div className="pt-content-col">
            <article className="pt-article">
              <Breadcrumbs
                items={[
                  { label: "خانه", href: "/" },
                  { label: post.category.name, href: `/category/${post.category.slug}` },
                  { label: post.title },
                ]}
              />
              {post.kicker ? <p className="pt-article-kicker">{post.kicker}</p> : null}
              <h1 className="pt-article-title">{post.title}</h1>
              <div className="pt-article-meta">
                <span className="meta-item">
                  <Link href={`/category/${post.category.slug}`} className="post-cat-link" rel="category">
                    {post.category.name}
                  </Link>
                </span>
                {" "}
                <ViewCounter slug={post.slug} initialViews={post.views} />
                {" "}
                {/* the English date pinned to the visual LEFT end of the row
                    (Top News placement, client request) — margin-auto in CSS */}
                <span className="meta-item date date-en">
                  <time
                    dateTime={published.toISOString()}
                    className="pt-meta-date-en"
                    dir="ltr"
                  >
                    {enDateLine(published)}
                  </time>
                </span>
              </div>
              {post.lead ? <p className="pt-article-lead">{post.lead}</p> : null}

              {heroImageSrc ? (
                <figure className="pt-article-figure">
                  <img
                    src={heroImageSrc}
                    alt={heroImage?.alt || post.title}
                    width={1200}
                    height={675}
                    fetchPriority="high"
                  />
                  {heroImage?.alt ? <figcaption>{heroImage.alt}</figcaption> : null}
                </figure>
              ) : null}

              {videoEmbed ? (
                <div className="pt-video-embed">
                  <iframe
                    src={videoEmbed.embedUrl}
                    title={post.title}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  />
                </div>
              ) : post.videoType === "UPLOAD" && post.videoUrl ? (
                <video className="pt-article-video" src={post.videoUrl} controls preload="metadata" />
              ) : null}

              <div className="pt-article-body" dangerouslySetInnerHTML={{ __html: post.body }} />

              <ShareRow url={shareUrl} title={post.title} />

              {related.length > 0 ? (
                <div className="pt-related">
                  <div className="pt-block-head pt-block-head-e pt-block-head-e2 is-left pt-archive-head">
                    <h2 className="heading">بیشتر بخوانید</h2>
                    <span className="pt-head-line" aria-hidden="true" />
                  </div>
                  <div className="pt-related-grid">
                    {related.map((a) => (
                      <RelatedCard key={a.url} article={a} />
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          </div>
          <aside className="pt-sidebar-col">
            <SidebarWidgets latest={latest} mostRead={mostRead} newsletter={newsletterBlock} />
          </aside>
        </div>
      </div>
    </div>
  );
}
