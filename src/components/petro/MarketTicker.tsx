'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TickerItem, MarketQuote } from '@/lib/content';

/**
 * Market data ticker — compact commodity cards after the client mobile
 * reference (359×474): white bar under the black header, market-menu glyph
 * pinned left (outside the moving region), dark two-row cards
 * [name | icon] / [price ▲ change (percent)].
 *
 * Motion (client request): the row is a SEAMLESS RIGHT-TO-LEFT marquee —
 * like the live site's original loop — and it is draggable: press and move
 * horizontally to scrub the cards in either direction; on release the
 * right-to-left loop resumes. Implementation:
 *  - the card set is rendered 3× (`​.pt-ticker-set`); the loop period is the
 *    offset distance between the first two sets (width + gap, measured at
 *    runtime, breakpoint-independent);
 *  - a rAF loop advances `translate3d` by a time-based speed and wraps the
 *    offset into [-period, 0) — with 3 copies any viewport up to twice the
 *    set width (≈5300px) is always covered, so the wrap is invisible;
 *  - Pointer Events drive the scrubbing (mouse + touch; `touch-action:
 *    pan-y` keeps vertical page scrolling native), pointer capture keeps
 *    the gesture alive outside the bar, and the loop pauses only while a
 *    drag is active — on release the right-to-left motion resumes at once;
 *  - the marquee runs on EVERY device (client report: the strip sat frozen
 *    on some phones). Cause: the old build parked the loop whenever the OS
 *    matched `prefers-reduced-motion: reduce` — Android "Remove animations",
 *    Samsung "Reduce animations" and iOS Reduce Motion all map to it, so
 *    those handsets showed a dead bar. The ticker is the delivery mechanism
 *    for the live prices themselves, so the auto-scroll is now
 *    unconditional; drag-to-browse remains the motion-free interaction.
 *
 * PHP-ticker parity (the client's own well-known.zip implementation the
 * backend now mirrors — see /api/market):
 *  - hover pauses the auto-scroll (index.php mouseenter/mouseleave) — MOUSE
 *    pointers only: touch devices keep the marquee running unconditionally
 *    (the freeze-report above);
 *  - a changed price flashes orange for 1s (index.php .updated-price glow,
 *    #fa9000) exactly like the PHP card;
 *  - quotes poll every 15s — the PHP UI polled fetch_prices.php every 5s
 *    behind a rand(18,22)s server cache, so the effective freshness was one
 *    cache period; 20s reproduced it, now tightened to 15s per the client
 *    report that updates felt slow (both the UI poll and the server TTL
 *    in /api/market moved to 15s).
 *
 * Data integrity (master prompt §07):
 *  - product names/icons come from the content layer (ticker.items);
 *  - prices/changes come from /api/market (the native fetch_prices.php
 *    port scraping tradingeconomics.com commodity pages);
 *  - nothing is hardcoded: when the upstream publishes no value the card
 *    shows an N/A unavailable state;
 *  - no fabricated feed, no demo values.
 *
 * Display order: the three petrochemical cards of the reference (methanol,
 * polyethylene, urea) lead the row; every other product of the dataset
 * follows in data order and stays reachable through the loop/scrub.
 */

/* circular card icons (reference form); the data-driven item.icon remains
   the fallback for any product without a dedicated card icon */
const CARD_ICONS: Record<string, string> = {
  methanol: '/assets/icons/ticker/card-methanol.svg',
  polyethylene: '/assets/icons/ticker/card-polyethylene.svg',
  urea: '/assets/icons/ticker/card-urea.svg',
};

const PRIORITY = ['methanol', 'polyethylene', 'urea'];

/* two copies cover any mobile or desktop viewport (> 2560px) seamlessly while
   keeping the composited GPU track compact below mobile texture tile limits */
const LOOP_COPIES = 2;

/* auto-scroll speed, px per second, right-to-left */
const SCROLL_SPEED = 30;

/* quote refresh cadence — matches the PHP ticker UI (5s poll against server cache) */
const QUOTES_POLL_MS = 5000;

export function MarketTicker({ items }: { items: TickerItem[] }) {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote> | null>(null);
  const [failed, setFailed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const alive = useRef(true);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!panelOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPanelOpen(false);
        toggleBtnRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [panelOpen]);

  useEffect(() => {
    alive.current = true;
    const load = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const res = await fetch('/api/market', { cache: 'no-store' });
        if (!res.ok) throw new Error(`market ${res.status}`);
        const json = (await res.json()) as { items?: MarketQuote[] };
        const map: Record<string, MarketQuote> = {};
        for (const q of json.items ?? []) map[q.key] = q;
        if (!alive.current) return;
        setQuotes(map);
        setFailed(false);
      } catch {
        if (alive.current) setFailed(true);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    load();
    const timer = setInterval(load, QUOTES_POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive.current = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  /* reference order (methanol → polyethylene → urea) first, remaining
     products in data order after them (stable sort) */
  const rank = (key: string) => {
    const i = PRIORITY.indexOf(key);
    return i === -1 ? PRIORITY.length : i;
  };
  const ordered = [...items].sort((a, b) => rank(a.key) - rank(b.key));

  /* ------------------------------------------------ loop machinery ------ */
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<Animation | null>(null);
  const posRef = useRef(0);
  const periodRef = useRef(0); /* one set width + gap, px */
  const draggingRef = useRef(false);
  const hoverRef = useRef(false);
  const dragStartX = useRef(0);
  const dragStartPos = useRef(0);
  const [dragging, setDragging] = useState(false);

  const wrapPos = useCallback((p: number, period: number) => {
    if (period <= 0) return p;
    let v = p % period;
    if (v > 0) v -= period;
    if (Object.is(v, -0)) v = 0;
    return v;
  }, []);

  const readLivePos = useCallback((): number => {
    const track = trackRef.current;
    if (!track) return posRef.current;
    const cs = window.getComputedStyle(track).transform;
    if (cs && cs !== 'none') {
      try {
        const m = new DOMMatrixReadOnly(cs);
        if (Number.isFinite(m.m41)) return m.m41;
      } catch {
        // Ignore invalid transform matrix
      }
    }
    return posRef.current;
  }, []);

  const applyManualPos = useCallback(() => {
    const track = trackRef.current;
    if (track) track.style.transform = `translate3d(${posRef.current.toFixed(2)}px, 0, 0)`;
  }, []);

  /* Freeze smoothly at the exact live compositor offset (avoids Chromium's
     WAAPI anim.pause()/play() pending-startTime teleport bug). */
  const pauseToStaticPos = useCallback(() => {
    if (animRef.current) {
      posRef.current = wrapPos(readLivePos(), periodRef.current);
      animRef.current.cancel();
      animRef.current = null;
    }
    applyManualPos();
  }, [readLivePos, wrapPos, applyManualPos]);

  /* Start/sync the marquee on the browser's GPU compositor thread via Web
     Animations API — runs at full hardware vsync (60/90/120Hz) with zero
     main-thread frame drops or integer rounding stutter. */
  const syncAnimation = useCallback(() => {
    const track = trackRef.current;
    const period = periodRef.current;
    if (!track || period <= 0) return;

    if (animRef.current) {
      posRef.current = readLivePos();
      animRef.current.cancel();
      animRef.current = null;
    }

    posRef.current = wrapPos(posRef.current, period);

    if (draggingRef.current || hoverRef.current || typeof track.animate !== 'function') {
      applyManualPos();
      return;
    }

    track.style.transform = '';
    const durationMs = (period / SCROLL_SPEED) * 1000;
    const anim = track.animate(
      [
        { transform: 'translate3d(0px, 0, 0)' },
        { transform: `translate3d(${-period}px, 0, 0)` },
      ],
      {
        duration: durationMs,
        iterations: Infinity,
        easing: 'linear',
      }
    );
    anim.currentTime = ((-posRef.current) / period) * durationMs;
    animRef.current = anim;
  }, [readLivePos, wrapPos, applyManualPos]);

  /* Loop period = distance between first two set wrappers. Only recreate the
     compositor animation when not yet started or when layout shifts meaningfully
     (> 4px, e.g., breakpoint flip or initial font load — prevents restarting on
     tiny 1px quote text updates). */
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.children.length < 2) return;
    const a = track.children[0] as HTMLElement;
    const b = track.children[1] as HTMLElement;
    const period = b.getBoundingClientRect().left - a.getBoundingClientRect().left;
    if (period > 0 && (periodRef.current === 0 || Math.abs(period - periodRef.current) > 4)) {
      periodRef.current = period;
      syncAnimation();
    }
  }, [syncAnimation]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    if (viewportRef.current) ro.observe(viewportRef.current);
    window.addEventListener('resize', measure);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) measure();
    });
    const mq = window.matchMedia('(min-width: 768px)');
    const onFlip = () => {
      periodRef.current = 0;
      measure();
    };
    mq.addEventListener?.('change', onFlip);
    return () => {
      alive = false;
      ro.disconnect();
      window.removeEventListener('resize', measure);
      mq.removeEventListener?.('change', onFlip);
      animRef.current?.cancel();
      animRef.current = null;
    };
  }, [measure]);

  /* Fallback rAF loop only when Web Animations API isn't supported */
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof track.animate === 'function') return;
    let raf = 0;
    let last: number | null = null;
    const tick = (ts: number) => {
      if (last === null) last = ts;
      const dt = Math.min(ts - last, 100);
      last = ts;
      if (!draggingRef.current && !hoverRef.current && periodRef.current > 0) {
        posRef.current = wrapPos(posRef.current - (SCROLL_SPEED * dt) / 1000, periodRef.current);
        applyManualPos();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [wrapPos, applyManualPos]);

  /* ------------------------------------------------ scrubbing ----------- */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pauseToStaticPos();
    draggingRef.current = true;
    dragStartX.current = e.clientX;
    dragStartPos.current = posRef.current;
    setDragging(true);
    viewportRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    posRef.current = wrapPos(dragStartPos.current + (e.clientX - dragStartX.current), periodRef.current);
    applyManualPos();
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const vp = viewportRef.current;
    if (vp && vp.hasPointerCapture(e.pointerId)) vp.releasePointerCapture(e.pointerId);
    syncAnimation();
  };

  return (
    <div className="pt-ticker-widget" ref={widgetRef} data-testid="market-ticker">
      <div className="pt-ticker-bar" dir="ltr">
        <button
          ref={toggleBtnRef}
          type="button"
          className={`pt-ticker-menu${panelOpen ? ' is-open' : ''}`}
          aria-expanded={panelOpen}
          aria-controls="pt-ticker-drawer"
          aria-label={panelOpen ? 'Close all market prices' : 'Show all market prices'}
          title={panelOpen ? 'بستن لیست قیمت‌ها' : 'نمایش همه قیمت‌ها'}
          onClick={() => setPanelOpen((v) => !v)}
        >
          <svg
            className="pt-ticker-caret"
            viewBox="0 0 11 7"
            width="11"
            height="7"
            focusable="false"
            aria-hidden="true"
          >
            <path d="M1 1l4.5 5L10 1" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <div
          className={`pt-ticker-viewport${dragging ? ' is-dragging' : ''}`}
          ref={viewportRef}
          data-testid="ticker-viewport"
          role="region"
          aria-label="Market prices — auto-scrolling loop, drag to browse"
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse') {
              hoverRef.current = true;
              pauseToStaticPos();
            }
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') {
              hoverRef.current = false;
              if (!draggingRef.current) syncAnimation();
            }
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="pt-ticker-track" ref={trackRef} data-testid="ticker-cards">
            {Array.from({ length: LOOP_COPIES }, (_, copy) => (
              <div
                className="pt-ticker-set"
                key={copy}
                aria-hidden={copy > 0 ? true : undefined}
              >
                {ordered.map((it) => (
                  <TickerCard key={it.key} item={it} quote={quotes?.[it.key]} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {panelOpen ? (
        <div
          id="pt-ticker-drawer"
          className="pt-ticker-drawer"
          role="dialog"
          aria-label="Market prices watchlist"
          dir="ltr"
          data-testid="ticker-drawer"
        >
          <div className="pt-ticker-drawer-head">
            <div className="pt-ticker-drawer-title">
              <span className={`pt-ticker-live-dot${failed ? ' is-stale' : ''}`} aria-hidden="true" />
              <span>Market Watch</span>
              <span className="pt-ticker-drawer-count">{ordered.length}</span>
            </div>
            <button
              type="button"
              className="pt-ticker-drawer-close"
              aria-label="Close market prices"
              onClick={() => {
                setPanelOpen(false);
                toggleBtnRef.current?.focus();
              }}
            >
              <svg viewBox="0 0 12 12" width="12" height="12" focusable="false" aria-hidden="true">
                <path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="pt-ticker-drawer-list" role="list">
            {ordered.map((it) => (
              <TickerDrawerRow key={it.key} item={it} quote={quotes?.[it.key]} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** parse a raw upstream value ("49.00", "+49.00", "-1.2", "N/A") to a number */
function parseNum(v: string | null | undefined): number | null {
  if (v == null) return null;
  const m = /-?\d+(?:\.\d+)?/.exec(String(v).replace(/,/g, ''));
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function formatQuoteState(quote?: MarketQuote) {
  const price = quote?.price ?? null;
  const change = quote?.change ?? null;
  const percent = quote?.percent ?? null;
  const priceNum = parseNum(price);
  const changeNum = parseNum(change);
  const unavailable =
    quote === undefined /* still loading */ ||
    priceNum === null ||
    changeNum === null;
  const direction: 'up' | 'down' | 'flat' =
    unavailable || changeNum === 0 ? 'flat' : changeNum > 0 ? 'up' : 'down';
  return { price, change, percent, unavailable, direction };
}

/* index.php .updated-price parity — a changed price flashes the orange glow for 1s */
function usePriceFlash(price: string | null) {
  const priceRef = useRef<HTMLSpanElement | null>(null);
  const prevPriceRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPriceRef.current;
    prevPriceRef.current = price;
    const el = priceRef.current;
    if (!el || prev == null || prev === price) return;
    el.classList.remove('is-updated');
    void el.offsetWidth; /* restart the animation on back-to-back changes */
    el.classList.add('is-updated');
    const t = setTimeout(() => el.classList.remove('is-updated'), 1000);
    return () => clearTimeout(t);
  }, [price]);
  return priceRef;
}

function TickerDrawerRow({ item, quote }: { item: TickerItem; quote?: MarketQuote }) {
  const { price, change, percent, unavailable, direction } = formatQuoteState(quote);
  const priceRef = usePriceFlash(price);

  return (
    <div className="pt-ticker-drawer-row" role="listitem" data-key={item.key}>
      <div className="pt-ticker-drawer-asset">
        <img
          className="pt-ticker-icon"
          src={CARD_ICONS[item.key] ?? item.icon}
          alt=""
          width={18}
          height={18}
          loading="eager"
          decoding="async"
          draggable={false}
        />
        <span className="pt-ticker-drawer-name">{item.name}</span>
      </div>
      <div className="pt-ticker-drawer-quote">
        {unavailable ? (
          <span className="pt-ticker-na">{quote === undefined ? '…' : 'N/A'}</span>
        ) : (
          <>
            <span ref={priceRef} className="pt-ticker-drawer-price">
              {price}
            </span>
            <span className={`pt-ticker-change pt-ticker-drawer-change ${direction}`}>
              {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '•'} {change} ({percent})
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function TickerCard({ item, quote }: { item: TickerItem; quote?: MarketQuote }) {
  const { price, change, percent, unavailable, direction } = formatQuoteState(quote);
  const priceRef = usePriceFlash(price);

  /* master prompt — desktop width classes: short/medium product names get
     the compact 224px card, standard/long names the standard 252px card.
     The class only changes flex-basis at ≥1025 (CSS); mobile/tablet keep
     their own measured widths. Name length is the stable content signal —
     market values change per fetch, names do not. */
  const compact = item.name.trim().length <= 9;

  return (
    <div
      className={`pt-ticker-card${compact ? ' is-compact' : ''}`}
      data-key={item.key}
    >
      <div className="pt-ticker-card-top">
        <span className="pt-ticker-name">{item.name}</span>
        <img
          className="pt-ticker-icon"
          src={CARD_ICONS[item.key] ?? item.icon}
          alt=""
          width={14}
          height={14}
          /* eager + async decode: `lazy` defers offscreen copies, and the
             marquee brings cards in via transform — a lazily-held icon
             popping/decoding at the strip edge reads as a stutter exactly
             where cards cross. 45 same-URL refs hit cache; cost ≈ 0. */
          loading="eager"
          decoding="async"
          draggable={false}
        />
      </div>
      <div className="pt-ticker-row">
        {unavailable ? (
          <span className="pt-ticker-na" data-testid="ticker-na">
            {quote === undefined ? '…' : 'N/A'}
          </span>
        ) : (
          <>
            <span ref={priceRef} className="pt-ticker-price">{price}</span>
            <span className={`pt-ticker-change ${direction}`}>
              {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '•'} {change} ({percent})
            </span>
          </>
        )}
      </div>
    </div>
  );
}
