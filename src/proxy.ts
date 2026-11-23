import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { deletedNewsSlugs } from "@/lib/deleted-news-slugs";

const SESSION_COOKIE = "petrotimes_session";

async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret) return false;
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

/** Answer 410 Gone for known-deleted news slugs so search engines drop them. */
function deletedNewsResponse(): NextResponse {
  return new NextResponse("Gone", {
    status: 410,
    headers: { "X-Robots-Tag": "noindex, noarchive" },
  });
}

function newsSlugOf(pathname: string): string | null {
  if (!pathname.startsWith("/news/")) return null;
  const raw = pathname.slice("/news/".length).replace(/\/+$/, "");
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Next.js 16 proxy (formerly middleware) — admin auth + 410 for deleted slugs
 *  + transparent rewrite of the Rank Math paginated post-sitemap URLs. */
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /post-sitemap1.xml … → /post-sitemap/1 (Rank Math post sitemap scheme;
  // the backend route lives at src/app/post-sitemap/[page]/route.ts)
  const postSitemapMatch = pathname.match(/^\/post-sitemap(\d+)\.xml$/);
  if (postSitemapMatch) {
    const url = req.nextUrl.clone();
    url.pathname = `/post-sitemap/${parseInt(postSitemapMatch[1], 10)}`;
    return NextResponse.rewrite(url);
  }

  // Permanently deleted news posts -> 410 Gone
  const slug = newsSlugOf(pathname);
  if (slug && deletedNewsSlugs.has(slug)) {
    return deletedNewsResponse();
  }

  // Everything below only applies to admin pages / admin API routes
  const isAdminPath =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!isAdminPath) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await isValidSession(token);

  const isLoginPage = pathname === "/admin/login";
  const isLoginApi = pathname === "/api/admin/auth/login";

  // Admin API routes -> 401 JSON instead of redirect
  if (pathname.startsWith("/api/admin/")) {
    if (isLoginApi) return NextResponse.next();
    if (!authed) {
      return NextResponse.json(
        { ok: false, error: "احراز هویت نشده" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Admin pages -> redirect to login
  if (!authed && !isLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Already logged in -> skip the login page
  if (authed && isLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/news/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    { source: "/post-sitemap:n(\\d+).xml" },
  ],
};
