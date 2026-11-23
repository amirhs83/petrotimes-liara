import Link from "next/link";
import "./pt-404.css";
import { siteName, siteNameEn } from "@/lib/site";

export const metadata = {
  title: "صفحه یافت نشد",
  robots: { index: false, follow: false },
};

/**
 * Global 404 — petro-styled (imports petro.css directly since it renders
 * outside the (public) group). Header bar + centered message + home link.
 */
export default function NotFound() {
  return (
    <div className="pt-404-page" dir="rtl">
      <header className="pt-404-header">
        <Link href="/" className="pt-404-logo" aria-label={`${siteNameEn} — ${siteName}`}>
          { }
          <img src="/assets/logos/logo-main-PAsset-3-1.png" alt={`${siteNameEn} — ${siteName}`} width={220} height={36} />
        </Link>
      </header>
      <main className="pt-404-main">
        <div className="pt-404-code">404</div>
        <h1 className="pt-404-title">صفحه‌ای که دنبالش بودید پیدا نشد</h1>
        <p className="pt-404-text">
          ممکن است آدرس اشتباه باشد یا این خبر حذف شده باشد. از صفحه اصلی ادامه دهید.
        </p>
        <Link href="/" className="pt-404-btn">
          بازگشت به صفحه اصلی
        </Link>
      </main>
    </div>
  );
}
