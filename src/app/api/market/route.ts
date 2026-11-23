import { NextResponse } from "next/server";
import { isSameOrigin, forbiddenOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/market — quotes for the homepage MarketTicker cards.
 *
 * Contract (src/lib/content/types.ts MarketQuote): one item per ticker
 * product, values are the RAW upstream strings ("3594.00", "+49.00",
 * "1.39%") or null when the upstream publishes no value — never fabricated.
 *
 * Upstream: the project's real market source (market.petrotimes.ir/
 * fetch_prices.php), configurable via MARKET_API_URL for staging. The route
 * never throws to the client: when the upstream is unreachable (sandbox,
 * cold network) it answers { items: [], stale: true } so the ticker cards
 * render their honest "unavailable" state instead of churning 404s every
 * 30 s (the old behaviour also kept client-side polling visibly "loading"
 * forever in proxied preview environments).
 */

interface UpstreamQuote {
  key?: unknown;
  price?: unknown;
  change?: unknown;
  percent?: unknown;
}

function normalize(item: UpstreamQuote): MarketQuoteLike | null {
  if (typeof item?.key !== "string" || !item.key) return null;
  const str = (v: unknown): string | null =>
    typeof v === "string" || typeof v === "number" ? String(v) : null;
  return {
    key: item.key,
    price: str(item.price),
    change: str(item.change),
    percent: str(item.percent),
  };
}

interface MarketQuoteLike {
  key: string;
  price: string | null;
  change: string | null;
  percent: string | null;
}

export async function GET(req: Request) {
  // Same-origin guard only for browser callers — this is a public GET feed,
  // so block cross-site form-style abuse but allow same-site navigation.
  if (!isSameOrigin(req)) return forbiddenOrigin();

  const upstream =
    process.env.MARKET_API_URL ?? "https://market.petrotimes.ir/fetch_prices.php";

  try {
    const res = await fetch(upstream, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = (await res.json().catch(() => null)) as
      | { items?: UpstreamQuote[] }
      | UpstreamQuote[]
      | null;

    const raw = Array.isArray(data) ? data : (data?.items ?? []);
    const items = raw
      .map(normalize)
      .filter((q): q is MarketQuoteLike => q !== null);

    return NextResponse.json(
      { ok: true, items, stale: false, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    // Honest degradation — no fabricated values, ticker shows N/A cards.
    return NextResponse.json(
      { ok: true, items: [], stale: true, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
