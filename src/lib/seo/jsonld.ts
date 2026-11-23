/**
 * JSON-LD builders — a faithful reproduction of the Rank Math @graph the live
 * WordPress site emits, produced server-side from CMS data.
 *
 * Node ids follow the Rank Math conventions so the structured data remains
 * stable across the WordPress → code migration:
 *   Organization   ${siteUrl}/#organization
 *   WebSite        ${siteUrl}/#website
 *   Person         ${siteUrl}/#/schema/person/editorial
 *   WebPage        ${pageUrl}/#webpage
 *   ImageObject    ${pageUrl}/#primaryimage
 *   BreadcrumbList ${pageUrl}/#breadcrumb
 *   NewsArticle    ${postUrl}/#NewsArticle
 *   CollectionPage ${archiveUrl}/#webpage
 */

import {
  absoluteUrl,
  siteAuthor,
  siteDescription,
  siteName,
  siteNameEn,
  siteSocials,
} from "@/lib/site";
import type { Article } from "@/lib/content/types";

const LANG = "fa-IR";
const LOGO_URL = absoluteUrl("/assets/logos/logo-main-PAsset-3-1.png");

/* ------------------------------------------------------------ site nodes --- */

export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: siteName,
    url: absoluteUrl("/"),
    sameAs: siteSocials,
    logo: {
      "@type": "ImageObject",
      "@id": absoluteUrl("/#logo"),
      url: LOGO_URL,
      contentUrl: LOGO_URL,
      width: 529,
      height: 88,
      caption: `${siteNameEn} — ${siteName}`,
      inLanguage: LANG,
    },
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    url: absoluteUrl("/"),
    name: siteName,
    alternateName: siteNameEn,
    description: siteDescription,
    inLanguage: LANG,
    publisher: { "@id": absoluteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/search")}?s={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function authorNode() {
  return {
    "@type": "Person",
    "@id": `${absoluteUrl("/#/schema/person")}/editorial`,
    name: siteAuthor,
    url: absoluteUrl("/about"),
    sameAs: siteSocials,
  };
}

/* ----------------------------------------------------------- page nodes --- */

export interface PageSeoInput {
  url: string;
  name: string;
  description?: string;
  image?: ImageSeoInput | null;
  breadcrumb?: BreadcrumbInput[] | null;
  addBreadcrumbRef?: boolean;
}

export interface ImageSeoInput {
  url: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface BreadcrumbInput {
  label: string;
  href?: string;
}

function imageNode(image: ImageSeoInput, id: string) {
  return {
    "@type": "ImageObject",
    "@id": id,
    url: image.url,
    contentUrl: image.url,
    ...(image.width && image.height
      ? { width: image.width, height: image.height }
      : {}),
    caption: image.alt || undefined,
    inLanguage: LANG,
  };
}

function breadcrumbNode(items: BreadcrumbInput[], id: string) {
  const base = absoluteUrl("/");
  return {
    "@type": "BreadcrumbList",
    "@id": id,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: item.href.startsWith("http") ? item.href : base + item.href.replace(/^\//, "") } : {}),
    })),
  };
}

export function webPageNode(input: PageSeoInput) {
  return {
    "@type": "WebPage",
    "@id": `${input.url}#webpage`,
    url: input.url,
    name: input.name,
    description: input.description,
    isPartOf: { "@id": absoluteUrl("/#website") },
    inLanguage: LANG,
    ...(input.image
      ? { primaryImageOfPage: { "@id": `${input.url}#primaryimage` } }
      : {}),
    ...(input.breadcrumb
      ? { breadcrumb: { "@id": `${input.url}#breadcrumb` } }
      : {}),
  };
}

export function collectionPageNode(input: PageSeoInput) {
  return {
    "@type": "CollectionPage",
    "@id": `${input.url}#webpage`,
    url: input.url,
    name: input.name,
    description: input.description,
    isPartOf: { "@id": absoluteUrl("/#website") },
    inLanguage: LANG,
    ...(input.breadcrumb
      ? { breadcrumb: { "@id": `${input.url}#breadcrumb` } }
      : {}),
  };
}

/* --------------------------------------------------------- article node --- */

export interface ArticleSeoInput {
  url: string;
  headline: string;
  description?: string | null;
  publishedAt: Date;
  modifiedAt: Date;
  section: string;
  keywords: string[];
  wordCount: number;
  image: ImageSeoInput | null;
  authorName: string;
}

export function newsArticleNode(input: ArticleSeoInput) {
  return {
    "@type": "NewsArticle",
    "@id": `${input.url}#NewsArticle`,
    url: input.url,
    headline: input.headline,
    description: input.description || undefined,
    datePublished: input.publishedAt.toISOString(),
    dateModified: input.modifiedAt.toISOString(),
    inLanguage: LANG,
    wordCount: input.wordCount,
    articleSection: [input.section],
    keywords: input.keywords.length ? input.keywords : undefined,
    image: input.image ? [imageNode(input.image, `${input.url}#primaryimage`)] : undefined,
    author: { "@id": `${absoluteUrl("/#/schema/person")}/editorial`, name: input.authorName },
    publisher: { "@id": absoluteUrl("/#organization") },
    mainEntityOfPage: { "@id": `${input.url}#webpage` },
  };
}

/* ---------------------------------------------------------- assemblers --- */

/**
 * Assembles a complete Rank Math-style @graph. `organization` and `website`
 * always come first (identical on every page), then page-specific nodes.
 */
export function assembleGraph(nodes: object[]): object {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationNode(), websiteNode(), ...nodes],
  };
}

/** Homepage — WebPage node describing the front page. */
export function homepageGraph(ogImage: ImageSeoInput | null): object {
  const url = absoluteUrl("/");
  return assembleGraph([
    webPageNode({
      url,
      name: `${siteName} - ${siteNameEn}`,
      description: siteDescription,
      image: ogImage,
      breadcrumb: null,
    }),
    ...(ogImage ? [imageNode(ogImage, `${url}#primaryimage`)] : []),
  ]);
}

/** Single news article — Person + WebPage + ImageObject + Breadcrumb + NewsArticle. */
export function articleGraph(input: ArticleSeoInput, breadcrumbs: BreadcrumbInput[]): object {
  const url = input.url;
  return assembleGraph([
    authorNode(),
    webPageNode({
      url,
      name: input.headline,
      description: input.description || undefined,
      image: input.image,
      breadcrumb: breadcrumbs,
    }),
    ...(input.image ? [imageNode(input.image, `${url}#primaryimage`)] : []),
    breadcrumbNode(breadcrumbs, `${url}#breadcrumb`),
    newsArticleNode(input),
  ]);
}

/** Archive (category / tag / همه اخبار) — CollectionPage + Breadcrumb. */
export function archiveGraph(
  input: { url: string; name: string; description?: string },
  breadcrumbs: BreadcrumbInput[]
): object {
  return assembleGraph([
    collectionPageNode({ ...input, breadcrumb: breadcrumbs }),
    breadcrumbNode(breadcrumbs, `${input.url}#breadcrumb`),
  ]);
}

/** Static pages (about / contact / privacy) — WebPage + Breadcrumb. */
export function staticPageGraph(
  input: { url: string; name: string; description?: string },
  breadcrumbs: BreadcrumbInput[]
): object {
  return assembleGraph([
    webPageNode({ ...input, breadcrumb: breadcrumbs }),
    breadcrumbNode(breadcrumbs, `${input.url}#breadcrumb`),
  ]);
}

/* ------------------------------------------------------------- helpers --- */

/** Breadcrumb trail for an archive page: خانه → label. */
export function archiveBreadcrumbs(label: string, href?: string): BreadcrumbInput[] {
  return [{ label: "خانه", href: "/" }, ...(href ? [{ label, href }] : [{ label }])];
}

/** Breadcrumb trail for an article: خانه → category → post title. */
export function articleBreadcrumbs(article: {
  title: string;
  category: { name: string; slug: string } | Article["category"];
}): BreadcrumbInput[] {
  const cat = article.category;
  return [
    { label: "خانه", href: "/" },
    ...(cat ? [{ label: cat.name, href: `/category/${cat.slug}` }] : []),
    { label: article.title },
  ];
}
