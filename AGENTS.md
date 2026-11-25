# 🛑 دستورالعمل‌های حیاتی پروژه پترو تایمز و قوانین ایمنی (Critical Safety Guidelines)

> **قانون قطعی و غیرقابل تغییر (STRICT INVARIANT):**
> بخش‌های حساس پروژه، متغیرهای امنیتی و به‌ویژه **پایگاه داده (Database)** به شدت محافظت‌شده هستند. هوش مصنوعی و هر ابزار توسعه موظف است در تمام شرایط، بدون استثنا، قوانین زیر را رعایت کند:

---

### ۱. ممنوعیت مطلق تغییر در دیتابیس بدون اجازه صریح کاربر (Zero Unauthorized DB Changes)
- **هیچ‌گونه تغییری در دیتابیس (چه لوکال و چه پروداکشن) نباید اعمال شود مگر با اجازه و درخواست مستقیم کاربر.**
- اجرای هر دستوری که داده‌ها یا اسکیمای دیتابیس را تغییر دهد یا بازنشانی کند، از جمله:
  - `prisma db push`
  - `prisma migrate`
  - `prisma db seed`
  - دستورات حذف یا ویرایش SQL (`DROP`, `DELETE`, `TRUNCATE`, `UPDATE`, `ALTER`)
  - اسکریپت‌های بازیابی یا ریستور مجدد
  **اکیداً ممنوع است** مگر اینکه کاربر صراحتاً در پیام خود دستور آن را صادر کرده باشد.

### ۲. حفاظت کامل از بخش‌ها و اطلاعات حساس (Protection of Sensitive Assets)
- به فایل‌های حساس، متغیرهای محیطی محرمانه، کلیدهای امنیتی و فایل‌های کانفیگ دست زده نشود.
- موارد زیر به هیچ وجه نباید بدون اجازه صریح کاربر تغییر، دستکاری یا بازنویسی شوند:
  - کلیدهای دسترسی و Secretهای سرویس پارس‌پک / S3 (`PARSPACK_*`)
  - کلید نشست کاربری (`SESSION_SECRET`)
  - اطلاعات ورود و احراز هویت ادمین (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)
  - رشته‌های اتصال به دیتابیس (`DATABASE_URL` — پروداکشن: Neon PostgreSQL) و توکن‌ها

### ۳. اصل دسترسی فقط-خواندنی به پروداکشن (Strict Read-Only for Production)
- تحت هیچ سناریویی هیچ دستوری علیه دیتابیس آنلاین یا سرویس‌های پروداکشن لیارا اجرا نمی‌شود.
- اطلاعات پروداکشن صرفاً جنبه **اطلاعاتی و ارجاعی (Reference-Only)** دارند.
- هیچ دستوری برای استقرار خودکار یا تغییر سرور روی لیارا بدون دستور مستقیم و تایید کاربر اجرا نخواهد شد.

### ۴. تفکیک کامل لوکال و پروداکشن (Local Isolation)
- تمام کارهای توسعه و آزمایشات باید کاملاً ایزوله در محیط محلی انجام شده و هیچ داده‌ای از محیط عملیاتی دستخوش ریسک نشود.

---

## معماری پروژه (Architecture Notes)

- **تک‌اپلیکیشن سه‌لایه:** CMS (مدل‌های Prisma + پنل ادمین + API) + Content Adapter (`src/lib/content/cms.ts`) + فرانت پیکسل‌پرفکت (`src/components/petro/` + `petro.css`).
- **قرارداد داده:** فرانت با شکل `HomepageData` (`src/lib/content/types.ts`، مستند در `docs/API-CONTRACT.md`) کار می‌کند؛ Adapter داده Prisma را به همین شکل تبدیل می‌کند.
- **جدا سازی CSS:** صفحات عمومی فقط `petro.css` (بدون preflight تیلویند — پیکسل‌پرفکت)؛ پنل ادمین فقط `globals.css` (Tailwind + shadcn).
- **جایگاه‌ها:** هر خبر به‌جز «آخرین اخبار/پربازدیدترین» یک جایگاه مشخص در سکشن‌های صفحه اصلی دارد (`HomeSection` + `SectionPlacement`؛ کلیدها: hero، videos، topnews، magazine، feature، energy، advertise1 («ادورتایز 1» — سه تصویر، از انرژی جدا شده)، advertise).
- **دیتابیس دوگانه:** اسکیمای کانننیکال `prisma/schema.prisma` = PostgreSQL (پروداکشن لیارا/Neon). برای توسعه محلی سندباکس، `bun run db:local:push` نسخه SQLite می‌سازد (`prisma/schema.local.prisma` — فایل تولیدشده، دستی ویرایش نشود).
- **تیکر قیمت:** طبق تصمیم کاربر فعلاً دست‌نخورده باقی می‌ماند (iframe واقعی سایت + fallback بومی).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
