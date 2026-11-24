import type { Article } from '@/lib/content';
import { HighlightsHero, SmallPostCard } from './PostCards';

/**
 * ENERGY section content: featured (788×685 incl. trailing block space) +
 * 2 secondary (gap 20). The former 3-col media-only tile grid moved OUT to
 * its own panel (ADVERTISE 1 — client request: "توی پنل جدا باشه و جزو
 * انرژی نیست").
 */
export function EnergySection({ main, subs }: { main: Article; subs: Article[] }) {
  return (
    <div data-testid="energy-section">
      <div className="pt-block-head pt-block-head-e pt-block-head-e2 is-left">
        <h4 className="heading">energy</h4>
      </div>
      <HighlightsHero
        article={main}
        weight="700"
        className="pt-hero-post pt-energy-main"
      />
      <div className="pt-energy-subs">
        {subs.map((a) => (
          <SmallPostCard key={a.url} article={a} />
        ))}
      </div>
    </div>
  );
}
