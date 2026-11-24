import type { Article } from '@/lib/content';
import { Icon } from './Primitives';
import { HighlightsHero, SmallPostCard } from './PostCards';

/**
 * ENERGY section content: featured (788×685 incl. trailing block space) +
 * 2 secondary (gap 20) + 3-col media-only grid (margin-top 30; tiles 4px
 * margins + block mb 55 → 195px boxes; gallery tiles show picture icon).
 */
export function EnergySection({
  main,
  subs,
  grid,
}: {
  main: Article;
  subs: Article[];
  grid: Article[];
}) {
  return (
    <div data-testid="energy-section">
      <div className="pt-block-head pt-block-head-e pt-block-head-e2 is-left">
        <h4 className="heading">energy</h4>
      </div>
      <HighlightsHero
        article={main}
        weight="700"
        className="pt-hero-post pt-energy-main"
        englishDate
      />
      <div className="pt-energy-subs">
        {subs.map((a) => (
          <SmallPostCard key={a.url} article={a} englishDateSlot />
        ))}
      </div>
      <div className="pt-energy-grid">
        {grid.map((a, i) => (
          <article className="pt-grid-post pt-energy-tile" key={`${a.url}-${i}`}>
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
  );
}
