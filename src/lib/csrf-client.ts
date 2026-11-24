"use client";

/**
 * CSRF double-submit helper for admin client code.
 *
 * The proxy (src/proxy.ts) seeds a readable `petrotimes_csrf` cookie on
 * every admin page load; mutating requests must echo that value in the
 * `x-csrf-token` header. Server-side (src/lib/security.ts) a mutating
 * request passes when the Origin matches the Host (direct deployments)
 * OR the token matches (proxy chains that rewrite the Host header —
 * preview panels, some PaaS gateways).
 *
 * All admin fetches go through `apiFetch` so the header is attached
 * automatically for POST/PUT/PATCH/DELETE.
 */

export const CSRF_COOKIE = "petrotimes_csrf";
export const CSRF_HEADER = "x-csrf-token";

export function csrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split(/;\s*/)
    .find((c) => c.startsWith(`${CSRF_COOKIE}=`));
  if (!entry) return null;
  try {
    const value = decodeURIComponent(entry.slice(CSRF_COOKIE.length + 1));
    return value || null;
  } catch {
    return null;
  }
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD";
  const headers = new Headers(init?.headers);
  if (mutating) {
    const token = csrfToken();
    if (token) headers.set(CSRF_HEADER, token);
  }
  return fetch(input, { ...init, headers });
}
