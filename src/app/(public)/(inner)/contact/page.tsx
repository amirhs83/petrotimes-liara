import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/petro/Inner";
import { JsonLd } from "@/components/petro/JsonLd";
import {
  absoluteUrl,
  rssAlternates,
  siteEmail,
  siteName,
  siteNameEn,
  siteSocials,
} from "@/lib/site";
import { staticPageGraph } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "تماس با ما",
  alternates: { canonical: "/contact", types: rssAlternates.types },
};

const SOCIAL_LABELS: { url: string; label: string }[] = [
  { url: "https://x.com/", label: "X (Twitter)" },
  { url: "https://www.facebook.com/", label: "Facebook" },
  { url: "https://t.me/", label: "Telegram" },
  { url: "https://youtube.com/", label: "YouTube" },
  { url: "https://Instagram.com/", label: "Instagram" },
];

export default function ContactPage() {
  return (
    <div className="pt-section">
      <JsonLd
        graph={staticPageGraph(
          {
            url: absoluteUrl("/contact"),
            name: "تماس با ما",
            description: `راه‌های ارتباط با تحریریه ${siteName}`,            
          },
          [{ label: "خانه", href: "/" }, { label: "تماس با ما" }]
        )}
      />
      <div className="pt-container">
        <div className="pt-columns">
          <div className="pt-content-col">
            <section className="pt-archive">
              <Breadcrumbs items={[{ label: "خانه", href: "/" }, { label: "تماس با ما" }]} />
              <div className="pt-block-head pt-block-head-e pt-block-head-e2 is-left pt-archive-head">
                <h1 className="heading">تماس با ما</h1>
                <span className="pt-head-line" aria-hidden="true" />
              </div>
              <div className="pt-static-body">
                <p>
                  تحریریه {siteName} ({siteNameEn}) همیشه آماده شنیدن نظرها، پیشنهادها و خبرهای
                  شماست. سریع‌ترین راه ارتباطی با ما ایمیل است.
                </p>
                <h2>ایمیل تحریریه</h2>
                <p>
                  <a className="pt-contact-mail" href={`mailto:${siteEmail}`}>
                    {siteEmail}
                  </a>
                </p>
                <h2>ارسال خبر و گزارش</h2>
                <p>
                  اگر شهروند روزنامه‌نگار هستید یا رخداد تازه‌ای در صنعت انرژی دیده‌اید، آن را برای
                  ما بفرستید؛ پس از بررسی و راستی‌آزمایی منتشر می‌کنیم.
                </p>
                <h2>تبلیغات و همکاری</h2>
                <p>
                  برای درج آگهی، همکاری محتوایی و گزارش‌های سفارشی، موضوع درخواست خود را در ایمیل
                  مطرح کنید تا کارشناسان ما پاسخ لازم را ارائه دهند.
                </p>
                <h2>شبکه‌های اجتماعی</h2>
                <ul>
                  {siteSocials.map((href, i) => (
                    <li key={href}>
                      <a href={href} target="_blank" rel="nofollow noopener">
                        {SOCIAL_LABELS[i]?.label ?? href}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
