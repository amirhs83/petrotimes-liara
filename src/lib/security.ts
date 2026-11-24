import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./auth";

/**
 * CSRF defense for mutating requests — two independent layers:
 *
 * 1. Origin check: browsers always send an Origin header on cross-site
 *    POSTs; combined with SameSite=Lax session cookies, rejecting foreign
 *    origins blocks CSRF. This is the primary layer in production where
 *    the Host header reaches the app intact.
 *
 * 2. Double-submit token fallback: reverse-proxy chains (preview panels,
 *    some PaaS gateways) may rewrite the Host header, which makes the
 *    origin comparison impossible. In that case a mutating request is
 *    accepted only when it carries the `x-csrf-token` header equal to the
 *    `petrotimes_csrf` cookie. Cross-site attackers can read neither our
 *    cookie (same-origin policy) nor set our custom header, so the
 *    protection holds regardless of proxy topology.
 */
export const CSRF_COOKIE = "petrotimes_csrf";
export const CSRF_HEADER = "x-csrf-token";

export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl etc.) carry no cookies from other origins
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** double-submit check: header value must match the cookie value. */
export function csrfTokenValid(req: Request): boolean {
  const header = req.headers.get(CSRF_HEADER);
  if (!header) return false;
  const cookie = req.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${CSRF_COOKIE}=`))
    ?.slice(CSRF_COOKIE.length + 1);
  if (!cookie) return false;
  try {
    const a = decodeURIComponent(header);
    const b = decodeURIComponent(cookie);
    return a.length > 0 && a === b;
  } catch {
    return false;
  }
}

/** mutating requests must pass EITHER layer */
export function requestTrusted(req: Request): boolean {
  return isSameOrigin(req) || csrfTokenValid(req);
}

export function forbiddenOrigin() {
  return NextResponse.json(
    { ok: false, error: "درخواست نامعتبر (CSRF)" },
    { status: 403 }
  );
}

export function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "احراز هویت نشده" },
    { status: 401 }
  );
}

/**
 * Guard for admin API routes: enforces same-origin (CSRF) on mutating methods
 * and a valid admin session. Returns the session or a ready-to-send response.
 */
export async function requireAdmin(
  req: Request
): Promise<{ session: SessionPayload } | { response: NextResponse }> {
  if (req.method !== "GET" && req.method !== "HEAD" && !requestTrusted(req)) {
    return { response: forbiddenOrigin() };
  }
  const session = await getSession();
  if (!session) return { response: unauthorized() };
  return { session };
}

export function isErrorResponse(
  result: { session: SessionPayload } | { response: NextResponse }
): result is { response: NextResponse } {
  return "response" in result;
}
