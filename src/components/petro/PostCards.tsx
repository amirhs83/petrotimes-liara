import type { Article } from '@/lib/content';
import { EnglishDateLine, Icon, PostMeta } from './Primitives';

/**
 * Standard small post card — 110px thumb + title/date.
 * Thumb renders on the right (RTL start) exactly like the live DOM order.
 * Title sizes measured on live: 17px/600 (sidebar, playlist, energy subs,
 * footer) and 15px/600 (hero secondary duo cards) — via `size` prop.
 */
export function SmallPostCard({
  article,
  size = 'm',
  playlist = false,
  clamp = true,
  englishDate = false,
}: {
  article: Article;
  /** m = 17px (default), s = 15px (hero secondary) */
  size?: 'm' | 's';
  playlist?: boolean;
  /** 2-line clamp (limit-lines) — sidebar/playlist/footer yes, duo cards no */
  clamp?: boolean;
  /** also render the Top News English date line (.pt-en-date, phones ≤767
   *  only via CSS) — TV playlist uses it to match the Top News meta */
  englishDate?: boolean;
}) {
  return (
    <article className={`pt-small-post ${size === 's' ? 'pt-t-s' : ''} ${clamp ? 'pt-clamp' : ''}`}>
      <div className="pt-media">
        <a href={article.url} className="pt-media-link" title={article.title} aria-label={article.title}>
          <span className="pt-media-ratio pt-ratio-thumb">
            <span
              className="pt-bg-cover"
              style={{ backgroundImage: `url("${article.image ?? ''}")`, position: 'absolute', top: 0, right: 0 } as React.CSSProperties}
            />
          </span>
          {playlist ? (
            <span className="pt-thumb-play">
              <Icon name="play" />
            </span>
          ) : null}
        </a>
      </div>
      <div className="pt-content">
        <h4 className="pt-post-title">
          <a href={article.url}>{article.title}</a>
        </h4>
        <PostMeta category={null} categoryUrl={null} dateText={article.dateText} />
        {englishDate ? <EnglishDateLine dateText={article.dateText} /> : null}
      </div>
    </article>
  );
}

/**
 * Highlights hero (SmartMag block-highlights): article + empty second loop
 * (26px) + block margin-bottom 55px → widget height includes 81px trailing
 * space, exactly as the live widget box.
 */
export function HighlightsHero({
  article,
  weight = '900',
  className = 'pt-hero-post',
  titleSize,
}: {
  article: Article;
  weight?: string;
  className?: string;
  titleSize?: string;
}) {
  return (
    <div className="pt-block-wrap-mb pt-block-mb">
      <article className={`pt-grid-post ${className}`}>
        <div className="pt-media">
          <a href={article.url} className="pt-image-link" title={article.title} aria-label={article.title}>
            <span className="pt-media-ratio pt-ratio-16-9">
              <span
                className="pt-bg-cover"
                style={{ backgroundImage: `url("${article.image ?? ''}")`, position: 'absolute', top: 0, right: 0 } as React.CSSProperties}
              />
            </span>
          </a>
        </div>
        <div className="pt-content">
          <h2
            className="pt-post-title"
            style={weight !== '700' ? { fontWeight: weight } : undefined}
          >
            <a href={article.url}>{article.title}</a>
          </h2>
          <PostMeta
            category={article.category}
            categoryUrl={article.categoryUrl}
            dateText={article.dateText}
          />
          {article.excerpt ? (
            <div className="pt-excerpt">
              <p>{article.excerpt}</p>
            </div>
          ) : null}
        </div>
      </article>
      <div className="pt-loop-small-space" aria-hidden="true" />
    </div>
  );
}
