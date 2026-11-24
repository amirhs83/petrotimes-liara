import type { FeatureArticle } from '@/lib/content';
import { PostMeta } from './Primitives';

/**
 * FEATURE TITLE — heading widget + 3 ranked items (rank PNG 28×28 at right).
 * Geometry: heading 21px/600 (2 lines in the 144px-wide column), items with
 * 30px row gap, category — date meta under each title.
 */
export function FeatureTitle({ items }: { items: FeatureArticle[] }) {
  return (
    <div data-testid="feature-title">
      <h4 className="pt-feature-heading">FEATURE&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj; TITLE</h4>
      <div className="pt-feature-list">
        {items.map((item) => (
          <article className="pt-feature-item" key={item.rankIcon}>
            <span className="pt-rank">
              { }
              <img src={item.rankIcon} alt="" width={28} height={28} />
            </span>
            <div className="pt-content">
              <h4 className="pt-post-title">
                <a href={item.url}>{item.title}</a>
              </h4>
              <PostMeta
                category={item.category}
                categoryUrl={item.categoryUrl}
                dateText={item.dateText}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
