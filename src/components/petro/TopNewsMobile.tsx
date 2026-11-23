import type { Article } from '@/lib/content';
import { englishMeta } from '@/lib/content/english-meta';
import { Icon } from './Primitives';

/**
 * TOP NEWS — mobile-only (≤767) reconstruction of the client's reference
 * raster (1200×1280 = a 400px viewport captured at 3×), rendered directly
 * below the featured hero news.
 *
 * Header bar: pure #000, 30px (= 89px raster / 3), no radius / shadow /
 * gradient; white bold "Top News" (Barlow, --ui-font) at the right edge of
 * the bar and, at the far right end, a 27px chevron zone (81px raster / 3)
 * holding a white chevron-left (the theme's own ts-icons glyph) behind a
 * 1px white separator on the zone's physical left edge.
 *
 * Rows (one per article, real site data only): 4:3 image on the RIGHT
 * (26.4% of the container = 303px raster / 1140, object-fit cover, square
 * corners, no border/shadow/badge) and a text column on the LEFT — bold
 * near-black title (RTL, may wrap; never clamped or truncated) with the
 * English date/time ("OCT 29, 2026 • 02:32 PM" — LTR, gray) pinned to the
 * bottom-left of the column via flex space-between, exactly as the
 * reference places it near the image bottom edge.
 *
 * Dates/times come from englishMeta() (the site's own Jalali → Gregorian
 * derivation, already used by the featured block); only formatting is
 * applied (reference shows zero-padded hours: "9:04" → "09:04").
 *
 * Geometry lives in scoped --tn-* tokens (reference raster / 3) inside
 * petro.css. The component is display:none ≥768: tablet keeps the existing
 * 2-column .pt-featured-secondary grid and desktop (≥1025) keeps the
 * pt-duo arrangement — nothing outside mobile ≤767 is affected.
 */

/** "9:04 AM" → "09:04 AM" — the reference raster zero-pads the hour. */
function zeroPadHour(time: string): string {
  return time.replace(/^(\d):/, '0$1:');
}

export function TopNewsMobile({ articles }: { articles: Article[] }) {
  return (
    <section className="pt-tn" aria-label="Top News">
      <div className="pt-tn-head">
        <span className="pt-tn-arrow" aria-hidden="true">
          <Icon name="angleLeft" />
        </span>
        <h2 className="pt-tn-heading">Top News</h2>
      </div>
      <div className="pt-tn-list">
        {articles.map((a) => {
          const meta = englishMeta(a.dateText, a.category);
          const dateLine = [meta.date, meta.time ? zeroPadHour(meta.time) : '']
            .filter(Boolean)
            .join(' • ');
          return (
            <article className="pt-tn-item" key={a.url}>
              <a
                href={a.url}
                className="pt-tn-media"
                title={a.title}
                aria-label={a.title}
                tabIndex={-1}
              >
                {a.imageFull ?? a.image ? (
                  <img
                    src={a.imageFull ?? a.image ?? ''}
                    alt={a.title}
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </a>
              <div className="pt-tn-text">
                <h3 className="pt-tn-title">
                  <a href={a.url}>{a.title}</a>
                </h3>
                {dateLine ? (
                  <p className="pt-tn-date" dir="ltr">
                    {dateLine}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
