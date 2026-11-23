import type { Article } from '@/lib/content';

/**
 * ADVERTISE row — 2 ad cards from the right inside a 1230px container
 * (5×231 columns, gap 15), -52px negative offset. Card 1 carries the section
 * heading (20px, line to the left); cards end with the 55px block space.
 */
export function AdvertiseRow({ label, items }: { label: string; items: Article[] }) {
  return (
    <div className="pt-advertise" data-testid="advertise-row">
      <div className="pt-advertise-inner">
        {items.map((a, i) => (
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
                      <span className="date-link"><time className="post-date">{a.dateText}</time></span>
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        ))}
      </div>
    </div>
  );
}
