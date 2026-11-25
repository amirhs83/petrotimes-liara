import { NextResponse } from "next/server";
import { isSameOrigin, forbiddenOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/market — quotes for the homepage MarketTicker cards.
 *
 * Native port of the client's own PHP ticker backend (well-known.zip —
 * fetch_prices.php), line by line:
 *  - the SAME 15 commodities → TradingEconomics row symbols;
 *  - the SAME cells per row: td#p (price) → price, td#nch → change,
 *    td#pch → percent (raw upstream strings, "N/A" when a row is missing);
 *  - the SAME "Mozilla/5.0" UA and the SAME ~20s cache (PHP rand(18,22)s →
 *    a fixed 20s TTL here), kept in server memory;
 *  - on failure the LAST GOOD snapshot is served (stale: true) instead of
 *    an empty answer — the strip never blanks out (the PHP cron kept the
 *    cache file for the same reason).
 *
 * Source change (the only deviation from the PHP, forced by the upstream):
 * tradingeconomics.com/commodities — the exact page fetch_prices.php scraped
 * — is JS/WebSocket-rendered today and its HTML no longer contains the
 * table (that is why the PHP cache is all "N/A" — verified: 0 data-symbol
 * rows in the served HTML, guest API discontinued with HTTP 410). The
 * commodity benchmark tables still ship STATICALLY on the individual
 * commodity pages with the identical tr[data-symbol] + td#p/#nch/#pch
 * markup, so the same parse recipe runs against TWO pages whose union
 * covers all 15 symbols:
 *   /commodity/naphtha → CL1, CO1, NG1, XB1, HO1, XAL1, NGEU, HG1 (energy +
 *                        copper) + MOB (naphtha) + CMA (methanol)
 *   /commodity/urea    → UFB, POL, PVC, BIT, PYL (urea, polyethylene,
 *                        polyvinyl, bitumen, polypropylene)
 * First occurrence of a row wins (PHP XPath ->item(0)).
 *
 * Contract (src/lib/content/types.ts MarketQuote): one item per ticker
 * product, values are the RAW upstream strings ("79.71", "-0.456",
 * "-0.57%") or null when the upstream publishes no value — never fabricated.
 */

const SYMBOLS: Record<string, string> = {
  "crude-oil": "CL1:COM",
  "brent-crude-oil": "CO1:COM",
  "natural-gas": "NG1:COM",
  "gasoline": "XB1:COM",
  "heating-oil": "HO1:COM",
  "coal": "XAL1:COM",
  "eu-natural-gas": "NGEU:COM",
  "naphtha": "MOB:COM",
  "methanol": "CMA:COM",
  "urea": "UFB:COM",
  "polyethylene": "POL:COM",
  "polyvinyl": "PVC:COM",
  "bitumen": "BIT:COM",
  "copper": "HG1:COM",
  "polypropylene": "PYL:COM",
};

/* symbol → commodity pages whose STATIC benchmark tables carry the row.
   Union covers all 15 symbols; the scoring parser picks the right row when
   a symbol appears in several tables (see parseRows). */
const PAGES = [
  "https://tradingeconomics.com/commodity/naphtha",      // energy mains + naphtha + methanol
  "https://tradingeconomics.com/commodity/urea",         // urea, polyethylene, polyvinyl, bitumen, polypropylene
  "https://tradingeconomics.com/commodity/eu-natural-gas", // EU natural gas (own main row)
  "https://tradingeconomics.com/commodity/copper",       // copper (own main row)
];

/* Streaming CFD symbols on TradingView public scanner (zero 60s CloudFront
   cache). Mapped strictly to instruments whose real-time feed matches the
   exact PetroTimes benchmark prices cleanly. */
const TV_SCANNER_URL = "https://scanner.tradingview.com/cfd/scan";
const TV_SYMBOLS: Record<string, { tv: string; decimals: number; chgDecimals: number }> = {
  "crude-oil": { tv: "FX:USOIL", decimals: 2, chgDecimals: 3 },
  "brent-crude-oil": { tv: "FX:UKOIL", decimals: 2, chgDecimals: 3 },
  "copper": { tv: "OANDA:XCUUSD", decimals: 4, chgDecimals: 4 },
};

const TE_CACHE_TTL_MS = 10_000; // TE CloudFront caches ~60s; refresh promptly on rollover
const LIVE_CACHE_TTL_MS = 3_000; // Real-time streaming CFD feed cache (3s)

interface Quote {
  price: string | null;
  change: string | null;
  percent: string | null;
}

interface CacheShape {
  /** key → quote (real values only) */
  quotes: Record<string, Quote>;
  at: number;
}

interface TvLiveQuote {
  close: number;
  chgPct: number;
  chgAbs: number;
}

let teCache: CacheShape | null = null;
let tvCache: { items: Record<string, TvLiveQuote>; at: number } | null = null;
let teInFlight: Promise<Record<string, Quote>> | null = null;
let tvInFlight: Promise<Record<string, TvLiveQuote>> | null = null;

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse every tr[data-symbol] row exactly like the PHP XPath recipe:
 * td#p → price, td#nch → change, td#pch → percent.
 *
 * A symbol can appear in SEVERAL tables on one page: the main "Price/Day"
 * benchmark table (the values the PHP scraped) and "Actual/Chg/%Chg" stats
 * tables whose nch cell means something else. The right row is picked by
 * score, document order breaking ties:
 *   +2  the row subscribes to the live feed (data-subscribe → main table)
 *   +1  change and percent signs agree (a real day-change row always does)
 */
function parseRows(html: string): Record<string, { q: Quote; score: number }> {
  const best: Record<string, { q: Quote; score: number }> = {};
  const rowRe = /<tr([^>]*)data-symbol="([^"]+)"([^>]*)>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const [, openA, sym, openB, cells] = m;
    const cell = (id: string): string | null => {
      const c = new RegExp(`<td[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)</td>`).exec(cells);
      if (!c) return null;
      const v = stripTags(c[1]);
      return v === "" ? null : v;
    };
    const q = { price: cell("p"), change: cell("nch"), percent: cell("pch") };
    if (q.price === null) continue;

    let score = 0;
    if (/data-subscribe/.test(openA) || /data-subscribe/.test(openB)) score += 2;
    if (signsAgree(q.change, q.percent)) score += 1;

    const cur = best[sym];
    if (!cur || score > cur.score) best[sym] = { q, score };
  }
  return best;
}

/** "−0.269" × "−0.34%" share the sign; unparseable/zero values never veto */
function signsAgree(change: string | null, percent: string | null): boolean {
  const num = (s: string | null): number | null => {
    if (!s) return null;
    const v = Number(s.replace(/[+,%\s]/g, ""));
    return Number.isFinite(v) ? v : null;
  };
  const c = num(change);
  const p = num(percent);
  if (c === null || p === null || c === 0 || p === 0) return true;
  return c > 0 === p > 0;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    // fetch_prices.php UA — kept verbatim
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`TE ${res.status} for ${url}`);
  return res.text();
}

/** fetch every needed page in parallel, merge their row maps.
 *  Symbols live on several pages/tables: the higher-scored row wins (main
 *  "Price/Day" rows beat "Actual/Chg/%Chg" stats rows — see parseRows);
 *  ties keep the earlier page's row. */
async function scrapeAll(): Promise<Record<string, Quote>> {
  const results = await Promise.allSettled(PAGES.map((u) => fetchPage(u).then(parseRows)));
  const merged: Record<string, { q: Quote; score: number }> = {};
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const [sym, v] of Object.entries(r.value)) {
      const cur = merged[sym];
      if (!cur || v.score > cur.score) merged[sym] = v;
    }
  }
  const out: Record<string, Quote> = {};
  for (const [sym, v] of Object.entries(merged)) out[sym] = v.q;
  return out;
}

function hasRealData(quotes: Record<string, Quote>): boolean {
  return Object.values(quotes).some((q) => q.price !== null && q.price !== "N/A");
}

function parseFiniteNum(v: string | null | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(/[+,%\s,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function formatSigned(v: number, decimals: number, suffix = ""): string {
  const fixed = v.toFixed(decimals);
  return v > 0 ? `+${fixed}${suffix}` : `${fixed}${suffix}`;
}

async function fetchTradingViewLive(): Promise<Record<string, TvLiveQuote>> {
  const tickers = Object.values(TV_SYMBOLS).map((v) => v.tv);
  const res = await fetch(TV_SCANNER_URL, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(3_000),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
    },
    body: JSON.stringify({
      symbols: { tickers },
      columns: ["close", "change", "change_abs", "update_mode"],
    }),
  });
  if (!res.ok) throw new Error(`TV ${res.status}`);
  const json = (await res.json()) as {
    data?: Array<{ s?: string; d?: [number, number, number, string] }>;
  };

  const out: Record<string, TvLiveQuote> = {};
  const byTv = new Map<string, [number, number, number, string]>();
  for (const row of json.data ?? []) {
    if (row.s && Array.isArray(row.d)) byTv.set(row.s, row.d);
  }

  for (const [key, cfg] of Object.entries(TV_SYMBOLS)) {
    const d = byTv.get(cfg.tv);
    if (!d) continue;
    const [close, chgPct, chgAbs, mode] = d;
    if (mode !== "streaming" || !Number.isFinite(close)) continue;
    out[key] = {
      close,
      chgPct: Number.isFinite(chgPct) ? chgPct : 0,
      chgAbs: Number.isFinite(chgAbs) ? chgAbs : 0,
    };
  }
  return out;
}

function formatTvOverlay(
  key: string,
  live: TvLiveQuote,
  teQ?: Quote
): Quote {
  const cfg = TV_SYMBOLS[key];
  const tePrice = parseFiniteNum(teQ?.price);
  const teChg = parseFiniteNum(teQ?.change);
  let change = live.chgAbs;
  let percent = live.chgPct;

  // Anchor daily change to TradingEconomics settlement close when available
  // and closely aligned (< 3%), so intraday ticks move smoothly from day's settlement.
  if (
    tePrice !== null &&
    teChg !== null &&
    tePrice > 0 &&
    Math.abs(live.close - tePrice) / tePrice < 0.03
  ) {
    const prevClose = tePrice - teChg;
    if (prevClose > 0) {
      change = live.close - prevClose;
      percent = (change / prevClose) * 100;
    }
  }

  return {
    price: live.close.toFixed(cfg.decimals),
    change: formatSigned(change, cfg.chgDecimals),
    percent: formatSigned(percent, 2, "%"),
  };
}

function refreshTeInBackground(): Promise<Record<string, Quote>> {
  if (!teInFlight) {
    teInFlight = scrapeAll()
      .then((quotes) => {
        if (hasRealData(quotes)) {
          teCache = { quotes, at: Date.now() };
        }
        return quotes;
      })
      .catch(() => teCache?.quotes ?? {})
      .finally(() => {
        teInFlight = null;
      });
  }
  return teInFlight;
}

function refreshTvInBackground(): Promise<Record<string, TvLiveQuote>> {
  if (!tvInFlight) {
    tvInFlight = fetchTradingViewLive()
      .then((items) => {
        if (Object.keys(items).length > 0) {
          tvCache = { items, at: Date.now() };
        }
        return items;
      })
      .catch(() => tvCache?.items ?? {})
      .finally(() => {
        tvInFlight = null;
      });
  }
  return tvInFlight;
}

export async function GET(req: Request) {
  // Same-origin guard only for browser callers — this is a public GET feed,
  // so block cross-site form-style abuse but allow same-site navigation.
  if (!isSameOrigin(req)) return forbiddenOrigin();

  const now = Date.now();
  const teStale = !teCache || now - teCache.at >= TE_CACHE_TTL_MS;
  const tvStale = !tvCache || now - tvCache.at >= LIVE_CACHE_TTL_MS;

  const teJob = teStale ? refreshTeInBackground() : null;
  const tvJob = tvStale ? refreshTvInBackground() : null;

  // Cold boot: wait briefly for both sources so initial cards populate cleanly.
  // Warm path: only wait briefly (~1.5s max) on fast live feed if stale, never
  // blocking user polls on slow 4-page TradingEconomics scrapes.
  if (!teCache && teJob) {
    await Promise.race([
      Promise.allSettled([teJob, tvJob].filter(Boolean)),
      new Promise((r) => setTimeout(r, 4_000)),
    ]);
  } else if (tvJob) {
    await Promise.race([tvJob, new Promise((r) => setTimeout(r, 1_500))]);
  }

  const teQuotes = teCache?.quotes ?? {};
  const tvItems = tvCache?.items ?? {};
  const updatedAtMs = Math.max(teCache?.at ?? 0, tvCache?.at ?? 0) || now;
  const stale = !teCache && Object.keys(tvItems).length === 0;

  return respond(teQuotes, tvItems, stale, new Date(updatedAtMs).toISOString());
}

function respond(
  teQuotes: Record<string, Quote>,
  tvItems: Record<string, TvLiveQuote>,
  stale: boolean,
  updatedAt: string
) {
  const items = Object.entries(SYMBOLS).map(([key, sym]) => {
    const live = tvItems[key];
    if (live) {
      return {
        key,
        ...formatTvOverlay(key, live, teQuotes[sym]),
      };
    }
    return {
      key,
      price: teQuotes[sym]?.price ?? null,
      change: teQuotes[sym]?.change ?? null,
      percent: teQuotes[sym]?.percent ?? null,
    };
  });
  return NextResponse.json(
    { ok: true, items, stale, updatedAt },
    { headers: { "Cache-Control": "no-store" } }
  );
}
