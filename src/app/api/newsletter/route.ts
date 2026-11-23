import { NextResponse } from "next/server";
import { isSameOrigin, forbiddenOrigin } from "@/lib/security";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { db, withDbRetry } from "@/lib/db";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/newsletter — newsletter subscription endpoint for the
 * NewsletterWidget (see src/components/petro/NewsletterWidget.tsx).
 *
 * Contract (docs/API-CONTRACT.md):
 *  - If NEWSLETTER_API_URL (or CONTENT_API_BASE_URL) is configured, the email
 *    is proxied to that upstream endpoint (POST {email}) — any backend that
 *    accepts a JSON email field works.
 *  - Without an upstream the subscription is stored in the local CMS database
 *    (NewsletterSubscriber, idempotent per email) so the widget confirms a
 *    real, persisted subscription instead of a 501.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbiddenOrigin();

  const ip = getClientIp(req);
  const rl = rateLimit(`newsletter:${ip}`, 5, 10 * 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { ok: false, message: "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 600) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "درخواست نامعتبر است." },
      { status: 400 }
    );
  }

  const email =
    typeof body === "object" && body !== null && "email" in body
      ? String((body as { email: unknown }).email).trim().slice(0, 200)
      : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, message: "نشانی ایمیل معتبر نیست." },
      { status: 400 }
    );
  }

  const upstream =
    process.env.NEWSLETTER_API_URL ?? process.env.CONTENT_API_BASE_URL;

  if (!upstream) {
    // No upstream configured — persist the subscription in the CMS database
    // (idempotent: re-subscribing keeps the first record).
    try {
      await withDbRetry(() =>
        db.newsletterSubscriber.upsert({
          where: { email },
          update: {},
          create: { email },
        })
      );
      return NextResponse.json({ ok: true, message: "عضویت شما ثبت شد." });
    } catch (err) {
      console.error("[newsletter] persist failed:", err);
      return NextResponse.json(
        { ok: false, message: "ثبت عضویت ناموفق بود؛ کمی بعد دوباره تلاش کنید." },
        { status: 500 }
      );
    }
  }

  try {
    const res = await fetch(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { message?: string }
        | null;
      return NextResponse.json(
        {
          ok: false,
          message: data?.message ?? "ثبت عضویت در سرویس خبرنامه ناموفق بود.",
        },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, message: "عضویت شما ثبت شد." });
  } catch {
    return NextResponse.json(
      { ok: false, message: "ارتباط با سرویس خبرنامه برقرار نشد." },
      { status: 502 }
    );
  }
}
