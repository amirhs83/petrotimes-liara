import type { Article } from '@/lib/content';
import { CategoryChip, EnglishDateLine, Icon } from './Primitives';
import { SmallPostCard } from './PostCards';

/**
 * TV PETRO TIMES — dark overlay block (video featured post) + playlist.
 * Verified geometry: head 33 (chip 32 + mb 1) + 28 + media 591 (4:3 of 788);
 * overlay content inset 23px padding + 10% right margin; title 28px/700
 * start-aligned; chip + date start-aligned.
 *
 * Client pass (phones ≤767): every TV item (player + playlist cards) also
 * renders the Top News English date line (.pt-en-date); CSS swaps it in for
 * the Persian post-date on phones only — ≥768 markup shows the Persian meta
 * exactly as before. The player play glyph points RIGHT like the playlist
 * thumbs (the old RTL mirror removed from .pt-play-icon .pt-icon).
 */
export function TvSection({ player, playlist }: { player: Article; playlist: Article[] }) {
  return (
    <>
      <section className="pt-tv-block" data-testid="tv-section">
        <div className="pt-block-head pt-block-head-d is-left">
          <h4 className="heading">TV&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj; Petro&zwnj;&zwnj;&zwnj; Times</h4>
        </div>
        <div className="pt-block-content">
          <article className="pt-overlay-post">
            <a href={player.url} className="pt-overlay-media" title={player.title} aria-label={player.title}>
              <span className="pt-media-ratio pt-ratio-4-3">
                <span
                  className="pt-bg-cover"
                  style={{ backgroundImage: `url("${player.image ?? ''}")`, position: 'absolute', top: 0, right: 0 } as React.CSSProperties}
                />
              </span>
              <span className="pt-media-gradient" />
              <span className="pt-play-icon" aria-hidden="true">
                <Icon name="play" />
              </span>
            </a>
            <div className="pt-content-wrap">
              <div className="pt-content">
                <div className="pt-post-meta">
                  <div className="meta-above">
                    <span className="meta-item cat-labels">
                      <CategoryChip label={player.category ?? ''} href={player.categoryUrl} />
                    </span>
                  </div>
                  <h2 className="pt-post-title">
                    <a href={player.url}>{player.title}</a>
                  </h2>
                  <div className="meta-below">
                    <span className="meta-item date">
                      <span className="date-link">
                        <time className="post-date">{player.dateText}</time>
                      </span>
                    </span>
                  </div>
                  {/* phones ≤767 only (CSS): Top News English date/time */}
                  <EnglishDateLine dateText={player.dateText} />
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
      <section className="pt-tv-playlist pt-dark" data-testid="tv-playlist">
        <div className="pt-loop">
          {playlist.map((a) => (
            <SmallPostCard key={a.url} article={a} playlist englishDate />
          ))}
        </div>
      </section>
    </>
  );
}
