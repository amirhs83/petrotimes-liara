'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Article } from '@/lib/content';
import { CategoryChip, Icon } from './Primitives';

/**
 * Magazine covers carousel (SmartMag slider, autoplay, hover arrows).
 * Slides per view: 1 on desktop/mobile, 2 at 768–940 (measured on live
 * tablet captures). Initialized to the slide visible at capture time.
 */
export function MagazineSlider({ label, articles }: { label: string; articles: Article[] }) {
  const [perView, setPerView] = useState(1);
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const mqTablet = window.matchMedia('(min-width: 768px) and (max-width: 940px)');
    const update = () => setPerView(mqTablet.matches ? 2 : 1);
    update();
    mqTablet.addEventListener('change', update);
    return () => mqTablet.removeEventListener('change', update);
  }, []);

  const maxIndex = Math.max(0, articles.length - perView);
  const go = useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => {
        const next = i + dir;
        if (next < 0) return maxIndex;
        if (next > maxIndex) return 0;
        return next;
      });
    },
    [maxIndex]
  );

  useEffect(() => {
    // visual-regression captures set window.__PT_FREEZE_SLIDERS__ so the
    // carousel is captured deterministically on slide 0 (same state the
    // reference screenshots document); normal browsing is unaffected.
    if (!(window as unknown as { __PT_FREEZE_SLIDERS__?: boolean }).__PT_FREEZE_SLIDERS__) {
      timer.current = setInterval(() => go(1), 4000);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [go]);

  // clamp is derived (not stored) — avoids setState inside effects
  const safeIndex = Math.min(index, maxIndex);
  const shift = perView === 1 ? safeIndex * 100 : safeIndex * (100 / perView);

  return (
    <section className="pt-magazine" data-testid="magazine">
      <div className="pt-block-head pt-block-head-e pt-block-head-e2 is-left">
        <h4 className="heading">
          <a href="/all-post">{label}</a>
        </h4>
      </div>
      <div className="pt-magazine-slider" data-slider="carousel" data-per-view={perView}>
        <button type="button" className="pt-magazine-arrow prev" aria-label="Previous" onClick={() => go(-1)}>
          <Icon name="angleRight" />
        </button>
        <div
          className="pt-magazine-track"
          style={{ transform: `translateX(${shift}%)`, transition: 'transform 0.5s ease' }}
        >
          {articles.map((a, i) => (
            <article
              className="pt-magazine-slide"
              key={`${a.url}-${i}`}
              aria-hidden={i < safeIndex || i >= safeIndex + perView}
              inert={i < safeIndex || i >= safeIndex + perView}
            >
              <div className="pt-media">
                <a href={a.url} className="pt-image-link" title={a.title}>
                  <span className="pt-media-ratio pt-ratio-3-4">
                    <span
                      className="pt-bg-cover"
                      style={{ backgroundImage: `url("${a.image ?? ''}")`, position: 'absolute', top: 0, right: 0 } as React.CSSProperties}
                    />
                  </span>
                </a>
                <span className="pt-media-gradient" />
                <div className="pt-overlay-meta">
                  <CategoryChip label={label} href="/all-post" />
                </div>
              </div>
            </article>
          ))}
        </div>
        <button type="button" className="pt-magazine-arrow next" aria-label="Next" onClick={() => go(1)}>
          <Icon name="angleLeft" />
        </button>
      </div>
    </section>
  );
}
