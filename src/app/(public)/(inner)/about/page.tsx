import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/petro/Inner";
import { JsonLd } from "@/components/petro/JsonLd";
import { absoluteUrl, rssAlternates, siteName, siteEmail } from "@/lib/site";
import { staticPageGraph } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "درباره ما",
  alternates: { canonical: "/about", types: rssAlternates.types },
};

export default function AboutPage() {
  return (
    <div className="pt-section">
      <JsonLd
        graph={staticPageGraph(
          {
            url: absoluteUrl("/about"),
            name: "درباره ما",
            description: `درباره ${siteName} — مرجع تخصصی اخبار نفت، گاز و انرژی`,
          },
          [{ label: "خانه", href: "/" }, { label: "درباره ما" }]
        )}
      />
      <div className="pt-container">
        <div className="pt-columns">
          <div className="pt-content-col">
            <section className="pt-archive">
              <Breadcrumbs items={[{ label: "خانه", href: "/" }, { label: "درباره ما" }]} />
              <div className="pt-block-head pt-block-head-e pt-block-head-e2 is-left pt-archive-head">
                <h1 className="heading">درباره ما</h1>
                <span className="pt-head-line" aria-hidden="true" />
              </div>
              <div className="pt-static-body">
                <p>
                  <strong>{siteName}</strong> (Petro Times) مرجع تخصصی اخبار نفت، گاز، پتروشیمی،
                  پالایش و پخش و اقتصاد انرژی ایران و جهان است. ما رویدادهای بازار انرژی را دقیق،
                  سریع و داده‌محور پوشش می‌دهیم تا مخاطبان حرفه‌ای — از فعالان بازار تا مدیران
                  صنعت و تحلیل‌گران — تصویری روشن از تحولات داشته باشند.
                </p>
                <h2>مأموریت ما</h2>
                <p>
                  انرژی یکی از ارکان اقتصاد ایران و جهان است؛ تصمیم‌های درست به اطلاعات درست
                  وابسته است. تیم تحریریه {siteName} هر روز مهم‌ترین اخبار بازار نفت و گاز،
                  تحولات پتروشیمی، تصمیم‌های اوپک، نرخ‌های جهانی و رخدادهای بازار داخلی را رصد و
                  با زبانی دقیق و بی‌طرف منتشر می‌کند.
                </p>
                <h2>چه چیزی منتشر می‌کنیم</h2>
                <ul>
                  <li>اخبار فوری بازار نفت، گاز و پتروشیمی</li>
                  <li>گزارش‌های تحلیلی و داده‌محور از زنجیره ارزش انرژی</li>
                  <li>پوشش تصمیم‌های سازمان‌ها، بازارهای جهانی و بورس انرژی</li>
                  <li>گزارش‌های تصویری و ویدیویی از صنعت انرژی</li>
                </ul>
                <h2>ارتباط با ما</h2>
                <p>
                  برای ارسال خبر، همکاری تحریریه‌ای یا تبلیغات می‌توانید از طریق ایمیل زیر با ما
                  در تماس باشید:
                </p>
                <p>
                  <a className="pt-contact-mail" href={`mailto:${siteEmail}`}>
                    {siteEmail}
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
