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

/* copies of the card set for the seamless wrap — 3 covers viewports up to
   twice the set width (the dataset is the fixed 15-product contract, so one
   set is ≈1.7k/2.7k px wide at mobile/desktop breakpoints) */
const LOOP_COPIES = 3;

/* auto-scroll speed, px per second, right-to-left */
const SCROLL_SPEED = 30;

/* quote refresh cadence — matched to the /api/market server TTL (15s) */
const QUOTES_POLL_MS = 15000;

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
    load();
    const timer = setInterval(load, QUOTES_POLL_MS);
    return () => {
      alive.current = false;
      clearInterval(timer);
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
  const posRef = useRef(0);
  const periodRef = useRef(0); /* one set width + gap, px */
  const draggingRef = useRef(false);
  const dragStartX = useRef(0);
  const dragStartPos = useRef(0);
  const [dragging, setDragging] = useState(false);

  /* The applied offset is snapped to whole CSS pixels: the float accumulator
     stays exact (time-based), but translate3d never lands on a half-pixel —
     fractional offsets make the compositor re-sample glyphs/card edges every
     frame (subpixel AA), which reads as broken "chunky" pixels while the
     row slides. 30px/s moves at most 1px per step, so rounding is invisible
     in motion but keeps text and card borders on the pixel grid. */
  const applyPos = useCallback(() => {
    const track = trackRef.current;
    if (track) track.style.transform = `translate3d(${Math.round(posRef.current)}px, 0, 0)`;
  }, []);

  /* wrap the offset into [-period, 0) so any drag position lands on the
     equivalent seamless spot */
  const normalize = useCallback(() => {
    const period = periodRef.current;
    if (period <= 0) return;
    while (posRef.current <= -period) posRef.current += period;
    while (posRef.current > 0) posRef.current -= period;
    applyPos();
  }, [applyPos]);

  /* Mobile motion hardening (client report: stutter at the strip edges where
     cards cross the clip). `width: max-content` resolves to fractional
     glyph-advance widths — every card edge then sits on a subpixel phase,
     so the integer-snapped marquee transform keeps re-sampling edges while
     a card crosses the clip. Fix: snap every card's natural width UP to a
     whole CSS pixel (ceil — the box always contains the full row, so no
     data is ever clipped; the §09 min-widths still clamp from below).
     Desktop/tablet keep their fixed flex-basis widths: there the inline
     width is cleared (and would be ignored anyway — basis ≠ auto). */
  const snapCardWidths = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.querySelectorAll<HTMLElement>('.pt-ticker-card'));
    if (window.matchMedia('(min-width: 768px)').matches) {
      for (const el of cards) {
        if (el.style.width) el.style.width = '';
      }
      return;
    }
    for (const el of cards) el.style.width = ''; /* clear → natural max-content */
    const widths = cards.map((el) => el.getBoundingClientRect().width); /* read pass */
    for (let i = 0; i < cards.length; i++) {
      cards[i].style.width = `${Math.ceil(widths[i])}px`; /* write pass: whole px */
    }
  }, []);

  /* the loop period = distance between the first two set wrappers
     (set width + inter-set gap — works for every breakpoint). Measured
     from getBoundingClientRect (fractional-exact — the current translate
     shifts both rects equally, so the difference is the exact pitch);
     the old integer-rounded offsetLeft left a ≤0.5px error that surfaced
     as a subpixel jump at the loop seam. */
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.children.length < 2) return;
    const a = track.children[0] as HTMLElement;
    const b = track.children[1] as HTMLElement;
    const period = b.getBoundingClientRect().left - a.getBoundingClientRect().left;
    if (period > 0) periodRef.current = period;
    normalize();
  }, [normalize]);

  /* snap widths first, then re-measure the period (widths change the pitch) */
  const remeasure = useCallback(() => {
    snapCardWidths();
    measure();
  }, [snapCardWidths, measure]);

  /* keep the period fresh: mount, viewport resize, and any layout change
     inside the row (quotes arriving, fonts loading) via ResizeObserver.
     The RO callback is measure-only (snap is idempotent; letting it run
     here too would just add one redundant pass per resize). */
  useEffect(() => {
    remeasure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    if (viewportRef.current) ro.observe(viewportRef.current);
    window.addEventListener('resize', remeasure);
    /* widths depend on the real font metrics — re-snap once fonts land —
       and again when the phone/desktop breakpoint flips */
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) remeasure();
    });
    const mq = window.matchMedia('(min-width: 768px)');
    const onFlip = () => remeasure();
    mq.addEventListener?.('change', onFlip);
    return () => {
      alive = false;
      ro.disconnect();
      window.removeEventListener('resize', remeasure);
      mq.removeEventListener?.('change', onFlip);
    };
  }, [remeasure, measure]);

  /* quotes arriving change card content → card widths change → re-snap */
  useEffect(() => {
    remeasure();
  }, [remeasure, quotes, failed]);

  /* auto-scroll: right-to-left, time-based (frame-rate independent),
     paused while an active drag scrubs the row AND while a mouse pointer
     hovers the strip (index.php parity: mouseenter/mouseleave cleared and
     restored the interval). Touch pointers never pause — the marquee must
     keep running on phones (the frozen-strip client report). */
  const hoverRef = useRef(false);
  useEffect(() => {
    let raf = 0;
    let last: number | null = null;
    const tick = (ts: number) => {
      if (last === null) last = ts;
      const dt = Math.min(ts - last, 100); /* clamp tab-switch jumps */
      last = ts;
      if (!draggingRef.current && !hoverRef.current && periodRef.current > 0) {
        posRef.current -= (SCROLL_SPEED * dt) / 1000;
        normalize();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [normalize]);

  /* ------------------------------------------------ scrubbing ----------- */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    draggingRef.current = true;
    dragStartX.current = e.clientX;
    dragStartPos.current = posRef.current;
    setDragging(true);
    viewportRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    posRef.current = dragStartPos.current + (e.clientX - dragStartX.current);
    normalize();
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const vp = viewportRef.current;
    if (vp && vp.hasPointerCapture(e.pointerId)) vp.releasePointerCapture(e.pointerId);
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
            /* index.php hover-pause, mouse pointers only (touch devices
               keep the strip running — see the motion notes above) */
            if (e.pointerType === 'mouse') hoverRef.current = true;
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') hoverRef.current = false;
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
