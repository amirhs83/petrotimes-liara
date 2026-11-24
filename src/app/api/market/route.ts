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

const CACHE_TTL_MS = 15_000; // client pass: 20s (PHP parity) → 15s — faster visible refresh

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

let cache: CacheShape | null = null;

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

export async function GET(req: Request) {
  // Same-origin guard only for browser callers — this is a public GET feed,
  // so block cross-site form-style abuse but allow same-site navigation.
  if (!isSameOrigin(req)) return forbiddenOrigin();

  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return respond(cache.quotes, false);
  }

  let quotes: Record<string, Quote> = {};
  try {
    quotes = await scrapeAll();
  } catch {
    /* handled below */
  }

  if (hasRealData(quotes)) {
    cache = { quotes, at: now };
    return respond(quotes, false);
  }

  // upstream failed / served nothing real — serve the last good snapshot
  // (the PHP cron kept its cache file for exactly this); never fabricate
  if (cache) return respond(cache.quotes, true);
  return respond({}, true);
}

function respond(quotes: Record<string, Quote>, stale: boolean) {
  const items = Object.entries(SYMBOLS).map(([key, sym]) => ({
    key,
    price: quotes[sym]?.price ?? null,
    change: quotes[sym]?.change ?? null,
    percent: quotes[sym]?.percent ?? null,
  }));
  return NextResponse.json(
    { ok: true, items, stale, updatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
