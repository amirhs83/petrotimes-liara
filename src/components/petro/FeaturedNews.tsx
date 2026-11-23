import type { Article } from '@/lib/content';
import { englishMeta } from '@/lib/content/english-meta';

/**
 * FEATURED NEWS (خبر ویژه) — editorial block redesigned after the client's
 * mobile reference (359×474, single source of truth for the mobile design).
 *
 * Mobile (≤767): single column — image (1.9:1) → eyebrow → headline → lead →
 * LTR meta row; section inset 10px per the client mobile rule.
 * Tablet (768-1024): single column, stepped type scale.
 * Desktop (≥1025): two columns — featured image LEFT, RTL content RIGHT
 * (grid `direction: ltr` keeps the media column left regardless of the RTL
 * page; the body column re-applies RTL).
 *
 * Data integrity:
 *  - every value comes from the content layer — nothing is hardcoded;
 *  - the eyebrow renders only when the article provides one (no empty slot);
 *  - the meta row derives English category/date/time via englishMeta() —
 *    segments without valid data are omitted, order is never inverted.
 *
 * The image is the page's most likely LCP element: rendered with a real <img>
 * (alt text, eager + high fetch priority) inside a fixed 1.9:1 aspect box, so
 * there is no layout shift and no unnecessary lazy loading.
 */
export function FeaturedNews({ article }: { article: Article }) {
  const meta = englishMeta(article.dateText, article.category);
  const img = article.imageFull ?? article.image ?? null;
  const metaItems = [
    { key: 'cat', node: meta.category, href: article.categoryUrl },
    { key: 'date', node: meta.date, href: null },
    { key: 'time', node: meta.time, href: null },
  ].filter((item) => item.node) as { key: string; node: string; href: string | null }[];

  return (
    <article className="pt-featured">
      <div className="pt-featured-grid">
        <div className="pt-featured-media">
          {img ? (
            <a
              href={article.url}
              className="pt-featured-image-link"
              title={article.title}
              aria-label={article.title}
              tabIndex={-1}
            >
              <img
                src={img}
                alt={article.title}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </a>
          ) : null}
        </div>
        <div className="pt-featured-body">
          {article.eyebrow ? <p className="pt-featured-eyebrow">{article.eyebrow}</p> : null}
          <h2 className="pt-featured-title">
            <a href={article.url}>{article.title}</a>
          </h2>
          {article.excerpt ? <p className="pt-featured-lead">{article.excerpt}</p> : null}
          {metaItems.length > 0 ? (
            <div className="pt-featured-meta" dir="ltr">
              {metaItems.map((item) => (
                <span className="pt-featured-meta-item" key={item.key}>
                  {item.href ? (
                    <a href={item.href}>{item.node}</a>
                  ) : (
                    item.node
                  )}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
