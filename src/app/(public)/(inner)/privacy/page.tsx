import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/petro/Inner";
import { JsonLd } from "@/components/petro/JsonLd";
import { absoluteUrl, rssAlternates, siteEmail, siteName } from "@/lib/site";
import { staticPageGraph } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "سیاست حفظ حریم خصوصی",
  alternates: { canonical: "/privacy", types: rssAlternates.types },
};

export default function PrivacyPage() {
  return (
    <div className="pt-section">
      <JsonLd
        graph={staticPageGraph(
          {
            url: absoluteUrl("/privacy"),
            name: "سیاست حفظ حریم خصوصی",
            description: `سیاست حفظ حریم خصوصی ${siteName}`,            
          },
          [{ label: "خانه", href: "/" }, { label: "حریم خصوصی" }]
        )}
      />
      <div className="pt-container">
        <div className="pt-columns">
          <div className="pt-content-col">
            <section className="pt-archive">
              <Breadcrumbs items={[{ label: "خانه", href: "/" }, { label: "حریم خصوصی" }]} />
              <div className="pt-block-head pt-block-head-e pt-block-head-e2 is-left pt-archive-head">
                <h1 className="heading">سیاست حفظ حریم خصوصی</h1>
                <span className="pt-head-line" aria-hidden="true" />
              </div>
              <div className="pt-static-body">
                <p>
                  حریم خصوصی مخاطبان {siteName} برای ما اهمیت دارد. این صفحه توضیح می‌دهد چه
                  اطلاعاتی جمع‌آوری می‌شود و چگونه از آن استفاده می‌کنیم.
                </p>
                <h2>داده‌های خبرنامه</h2>
                <p>
                  برای عضویت در خبرنامه فقط آدرس ایمیل شما ذخیره می‌شود و تنها برای ارسال
                  خبرنامه استفاده می‌گردد. هر زمان می‌توانید با یک ایمیل به{" "}
                  <a href={`mailto:${siteEmail}`}>{siteEmail}</a> عضویت خود را لغو کنید.
                </p>
                <h2>شمارش بازدید</h2>
                <p>
                  برای نمایش «پربازدیدترین» مطالب، تعداد بازدید هر صفحه به‌صورت ناشناس شمرده
                  می‌شود؛ به این عدد و هیچ داده شخصی دیگری از سمت مرورگر شما دسترسی نداریم و
                  امکان شناسایی هویت از این مسیر وجود ندارد.
                </p>
                <h2>کوکی‌ها</h2>
                <p>
                  سایت از کوکی‌های ضروری برای عملکرد اصلی استفاده می‌کند و کوکی ردیابی تبلیغاتی
                  ثبت نمی‌کند. با تنظیمات مرورگر می‌توانید کوکی‌ها را حذف یا مسدود کنید؛ این کار
                  مانع خواندن مطالب نمی‌شود.
                </p>
                <h2>لینک‌های بیرونی</h2>
                <p>
                  ممکن است در مطالب به سایت‌های دیگر لینک داده شود. مسئولیت سیاست حریم خصوصی آن
                  سایت‌ها با انتشاردهنده آن‌ها است و ما محتوای آن‌ها را کنترل نمی‌کنیم.
                </p>
                <h2>تغییرات این سیاست</h2>
                <p>
                  در صورت بازنگری این سیاست، نسخه به‌روزشده در همین صفحه منتشر می‌شود و تاریخ
                  آخرین تغییر همان‌جا اعلام خواهد شد.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
