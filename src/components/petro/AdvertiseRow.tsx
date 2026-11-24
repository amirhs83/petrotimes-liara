import type { Article } from '@/lib/content';
import { topNewsDateLine } from '@/lib/content/english-meta';
import { Icon } from './Primitives';

/**
 * ADVERTISE 1 — separate panel holding the three media tiles that used to
 * close the ENERGY section (client request: "باید توی پنل جدا باشه و جزو
 * انرژی نیست — اسمشم بزار ادورتایز 1"). Same tile recipe as before (16:9
 * media-only tile, gallery posts keep the picture glyph). No visible
 * heading — the client asked to drop the label above the tiles
 * ("نیاز نیست بالای تصاویر بزاری بذارش، برش دار"). The panel is managed
 * from the dedicated admin section «ادورتایز 1» (HomeSection key
 * "advertise1"), no longer from energy positions 4-6.
 */
export function AdvertiseOne({ items }: { items: Article[] }) {
  return (
    <div className="pt-advertise pt-advertise-one" data-testid="advertise-one">
      <div className="pt-advertise-inner pt-advertise-one-inner">
        <div className="pt-advertise-one-grid">
          {items.map((a, i) => (
            <article className="pt-grid-post pt-advertise-one-tile" key={`${a.url}-${i}`}>
              <div className="pt-media">
                <a href={a.url} className="pt-image-link" title={a.title} aria-label={a.title || undefined}>
                  <span className="pt-media-ratio pt-ratio-16-9">
                    <span
                      className="pt-bg-cover"
                      style={{ backgroundImage: `url("${a.image ?? ''}")`, position: 'absolute', top: 0, right: 0 } as React.CSSProperties}
                    />
                  </span>
                  {a.url.includes('post-format-gallery') ? (
                    <span className="pt-play-icon pt-gallery-icon" aria-hidden="true">
                      <Icon name="pictureO" />
                    </span>
                  ) : null}
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * ADVERTISE row — 2 ad cards from the right inside a 1230px container
 * (5×231 columns, gap 15), -52px negative offset. Card 1 carries the section
 * heading (20px, line to the left); cards end with the 55px block space.
 * The meta date carries the English Top News line at every breakpoint
 * (client: "هرجایی که تاریخ فارسی بود به همین فرمت درش بیار").
 */
export function AdvertiseRow({ label, items }: { label: string; items: Article[] }) {
  return (
    <div className="pt-advertise" data-testid="advertise-row">
      <div className="pt-advertise-inner">
        {items.map((a, i) => {
          const enDate = topNewsDateLine(a.dateText);
          return (
            <div className="pt-advertise-col" key={`${a.url}-${i}`}>
              {i === 0 ? (
                <div className="pt-block-head pt-block-head-e pt-block-head-e2 is-left">
                  <h4 className="heading">{label}</h4>
                </div>
              ) : null}
              <article className="pt-advertise-card">
                <div className="pt-media">
                  <a href={a.url} className="pt-image-link" title={a.title} aria-label={a.title}>
                    <span className="pt-media-ratio pt-ratio-16-9">
                      <span
                        className="pt-bg-cover"
                        style={{ backgroundImage: `url("${a.image ?? ''}")`, position: 'absolute', top: 0, right: 0 } as React.CSSProperties}
                      />
                    </span>
                  </a>
                </div>
                <div className="pt-content">
                  <h4 className="pt-post-title">
                    <a href={a.url}>{a.title}</a>
                  </h4>
                  <div className="pt-post-meta">
                    <div className="meta-below">
                      <span className="meta-item date">
                        <span className="date-link">
                          <time
                            className={`post-date${enDate ? ' pt-meta-date-en' : ''}`}
                            dir={enDate ? 'ltr' : undefined}
                          >
                            {enDate ?? a.dateText}
                          </time>
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </div>
  );
}
