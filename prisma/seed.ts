/**
 * Petro Times seed — fresh content for the new petrotimes.ir.
 *
 * Creates (deterministically — wipe-and-recreate for content tables):
 *  - Categories (PetroTimes taxonomy: نفت / گاز / پتروشیمی / پالایش و پخش / بین الملل)
 *  - HomeSections (the 8 manual slots of the PetroTimes homepage layout)
 *  - Admin user (ADMIN_EMAIL / ADMIN_PASSWORD env; existing admin is untouched)
 *  - ~41 sample posts — every post ships with:
 *      · homeImage (card / OG fallback)  · innerImage (article hero)
 *      · a rich Persian body with <h2> subheads, an expert <blockquote> and
 *        TWO inline <figure> images with Persian figcaptions
 *      · 3 tags + full SEO meta (title/description/keywords)
 *    and is distributed into every homepage slot (manual placements) plus
 *    the automatic most-viewed / latest columns.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const prisma = new PrismaClient();

// ---------------- taxonomy ----------------

const categories = [
  { name: "نفت", slug: "naft", order: 1 },
  { name: "گاز", slug: "gas", order: 2 },
  { name: "پتروشیمی", slug: "petroshimi", order: 3 },
  { name: "پالایش و پخش", slug: "palayesh-va-pakhsh", order: 4 },
  { name: "بین الملل", slug: "bein-al-melal", order: 5 },
];

// ---------- homepage sections (PetroTimes layout slots) ----------

const homeSections = [
  { key: "hero", name: "سرخط خبرها", capacity: 5 }, // [1] hero + [2..5] secondary
  { key: "videos", name: "پترو تایمز TV", capacity: 6 }, // [1] player + [2..6] playlist
  { key: "topnews", name: "مطالب ویژه سایدبار", capacity: 4 },
  { key: "magazine", name: "مجله", capacity: 5 },
  { key: "feature", name: "برترین‌ها", capacity: 3 },
  { key: "energy", name: "انرژی", capacity: 3 }, // [1] main + [2..3] subs
  { key: "advertise1", name: "ادورتایز 1", capacity: 3 }, // the three media tiles panel (ex-energy grid)
  { key: "advertise", name: "تبلیغات ویژه", capacity: 2 },
];

// ---------------- image pool ----------------

const IMG = {
  oil1: "/images/news/3044119-e1787173519999-768x424.jpg",
  oil2: "/images/news/41-768x431.jpg",
  oil3: "/images/news/36-768x346.jpg",
  refinery: "/images/news/34-768x420.jpg",
  gas1: "/images/news/37-768x434.jpg",
  market: "/images/news/40-768x426.jpg",
  export: "/images/news/44-768x481.jpg",
  petchem1: "/images/news/3295646-768x512.jpg",
  petchem2: "/images/news/3232250-e1787152982323-768x478.jpg",
  tank: "/images/news/2215005-e1787153635623-768x496.jpg",
  rig: "/images/news/382447-e1787172793919.jpg",
  politics: "/images/news/n00033027-b-e1787160263308-300x290.jpg",
  oilref: "/images/news/sepahan-oil-1.jpg",
  meeting: "/images/news/photo_2024-11-12_23-46-53-768x512.jpg",
  deal: "/images/news/3043855-e1787174523767.jpg",
  chart: "/images/news/3288376-e1787159904630-200x162.jpg",
  mag1: "/images/news/30-450x613.jpg",
  mag2: "/images/news/photo_2024-11-03_22-37-15-450x557.jpg",
  mag3: "/images/news/photo_2024-11-03_22-37-15-768x951.jpg",
  mag4: "/images/news/30-768x1046.jpg",
  mag5: "/images/news/30-1128x1536.jpg",
  banner: "/images/news/ChatGPT-Image-Aug-20-2026-10_33_07-AM-768x432.png",
  // AI-generated themed visuals (1344x768) for rich inline article figures
  genRefinery: "/images/news/gen-refinery.png",
  genOffshore: "/images/news/gen-offshore.png",
  genPetchem: "/images/news/gen-petchem.png",
  genPipeline: "/images/news/gen-pipeline.png",
  genTanker: "/images/news/gen-tanker.png",
  genLng: "/images/news/gen-lng.png",
  genOpec: "/images/news/gen-opec.png",
} as const;

/** landscape images suitable for inline article figures */
const INLINE_POOL = [
  IMG.genRefinery,
  IMG.genOffshore,
  IMG.genPetchem,
  IMG.genPipeline,
  IMG.genTanker,
  IMG.genLng,
  IMG.genOpec,
  IMG.oil1,
  IMG.refinery,
  IMG.gas1,
  IMG.market,
  IMG.export,
];

const INLINE_CAPTIONS = [
  "نمایی از تاسیسات فرآورش؛ افزایش ظرفیت پالایش در کانون برنامه‌های زنجیره ارزش است.",
  "بر اساس داده‌های منتشرشده، روند سرمایه‌گذاری در بخش بالادستی صنعت انرژی رو به رشد است.",
  "تصویری از مجتمع صنعتی انرژی؛ بهره‌وری انرژی، محور اصلی طرح‌های توسعه‌ای است.",
  "زیرساخت انتقال و ذخیره‌سازی، حلقه اتصال میدان‌های تولیدی به شبکه مصرف است.",
  "پایش مستمر شاخص‌های بازار، مبنای تصمیم‌سازی بازیگران صنعت انرژی است.",
  "گزارش میدانی پترو تایمز از تاسیسات تولید و پخش فرآورده‌های انرژی.",
];

// ---------------- deterministic picker ----------------

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** deterministic pick — stable across re-runs, varies between posts */
function pick<T>(seed: string, arr: readonly T[], offset = 0): T {
  return arr[(hashStr(seed) + offset * 7919) % arr.length];
}

// ---------------- Persian editorial pools ----------------

const PARA_POOLS: Record<string, readonly string[]> = {
  naft: [
    "بر اساس داده‌های منتشرشده از بازارهای جهانی، معادلات عرضه نفت خام در هفته‌های اخیر با حساسیت بیشتری دنبال می‌شود و همین موضوع، پیش‌بینی روند قیمت‌ها را برای تحلیلگران دشوار کرده است.",
    "کارشناسان حوزه بالادستی معتقدند تثبیت ظرفیت تولید در میدان‌های اصلی کشور، پیش‌شرط ماندگاری سهم ایران در بازارهای منطقه‌ای است؛ موضوعی که در بودجه سالانه صنعت نفت نیز به آن توجه شده است.",
    "بازار فیزیکی نفت در آسیا همچنان مقصد اصلی محموله‌های صادراتی است و رقبای منطقه‌ای برای حفظ سهم خود از مشتریان سنتی، از ابزارهای مختلف رقابتی بهره می‌گیرند.",
    "گزارش‌های میدانی پترو تایمز نشان می‌دهد طرح‌های توسعه‌ای میدان‌های مشترک با تمرکز بر افزایش ضریب بازیابی، در فاز اجرایی پیش می‌روند و اثر آن‌ها بر تولید پایدار از نیمه دوم سال محسوس‌تر می‌شود.",
    "از نگاه فعالان بازار، شفافیت قراردادهای فروش و تنوع‌بخشی به مسیرهای صادراتی، دو اهرم کلیدی برای کاهش ریسک‌های ناشی از نوسانات geopolitical و حفظ جریان درآمد ارزی است.",
    "تحلیل داده‌های بارگیری در پایانه‌های صادراتی، روند قابل اتکایی از وضعیت عرضه ارائه می‌دهد؛ شاخصی که سرمایه‌گذاران بخش پایین‌دستی نیز برای برنامه‌ریزی خود استفاده می‌کنند.",
  ],
  gas: [
    "برنامه‌ریزی زمستانه شبکه گاز کشور امسال با محوریت ذخیره‌سازی راهبردی و مدیریت مصرف صورت گرفته است؛ رویکردی که بر اساس تجربه سال‌های گذشته، احتمال ریسک ناترازی را کاهش می‌دهد.",
    "داده‌های عملیاتی شرکت ملی پخش نشان می‌دهد سهم صنایع انرژی‌بر از مصرف گاز طبیعی همچنان قابل توجه است و اصلاح الگوی مصرف این بخش، بیشترین اثر را بر ناترازی فصل سرد دارد.",
    "پیشرفت طرح‌های توسعه میدان‌های گازی حاشیه خلیج فارس، متغیر اصلی تامین پایدار شبکه ملی گاز است؛ گلوگاهی که سال‌هاست در کانون تصمیم‌های سرمایه‌گذاری قرار دارد.",
    "توسعه زیرساخت پالایش گاز و بازیافت مایعات گازی (NGL)، علاوه بر افزایش ارزش‌افزوده زنجیره، مسیر صادرات محصولات پتروشیمی را نیز هموارتر می‌کند.",
    "کارشناسان تأکید می‌کنند که اجرای کامل پروژه‌های طرح‌بندی‌شده در حوزه انتقال گاز، بدون تزریق سرمایه خصوصی و تسهیل مجوزها، در بازه زمانی هدف محقق نخواهد شد.",
    "سناریوهای مدل‌سازی‌شده برای فصل سرد نشان می‌دهد مدیریت تقاضای صنعتی و تکمیل پروژه‌های ذخیره‌سازی زیرزمینی، دو ستون اصلی تعادل شبکه در ماه‌های پایانی سال خواهند بود.",
  ],
  petroshimi: [
    "بازار جهانی محصولات پتروشیمی در ماه‌های اخیر با نوسان حاشیه سود واحدهای تولیدی روبه‌رو بوده است؛ متغیری که مستقیماً بر برنامه صادراتی تولیدکنندگان داخلی اثر می‌گذارد.",
    "بر اساس آمار گمرکی، سبد صادراتی پتروشیمی کشور تنوع بیشتری یافته و سهم محصولات با ارزش‌افزوده بالاتر — از اولفین‌ها تا پلیمرهای مهندسی — روند افزایشی گرفته است.",
    "تامین پایدار خوراک واحدهای پتروشیمی، اصلی‌ترین گلوگاه بهره‌برداری است؛ موضوعی که در گفت‌وگوهای قیمت‌گذاری خوراک نیز به عنوان پیش‌شرط توسعه ظرفیت مطرح می‌شود.",
    "فعالان صنعت پلیمر بر این باورند که ورود به زنجیره ارزش محصولات تخصصی‌تر، نیازمند هم‌زمانی سرمایه‌گذاری در فناوری، تربیت نیروی انسانی و پیوند با بازارهای صادراتی هدف است.",
    "روند جهانی جایگزینی سوخت‌های فسیلی، تقاضای مواد پتروشیمی را در بلندمدت تقویت کرده است؛ چشم‌اندازی که موقعیت واحدهای دارای ظرفیت مازاد را متحول می‌کند.",
    "از نگاه مشتریان منطقه‌ای، کیفیت و ثبات کیفیت بارگیری، مهم‌تر از اختلاف قیمتی چند دلاری است؛ تجربه‌ای که در مذاکرات قراردادهای بلندمدت نمود عینی دارد.",
  ],
  "palayesh-va-pakhsh": [
    "شاخص‌های عملیاتی پالایشگاه‌های کشور در ماه‌های اخیر روند بهبود را نشان می‌دهد؛ بهبودی که حاصل تمرکز بر تثبیت ظرفیت فرآورش و کاهش توقفات برنامه‌ریزی‌نشده است.",
    "افزایش عمق تبدیل نفت در برج تقطیر، یعنی تولید بیشتری از محصولات با ارزش نظیر گازوئیل یورو۴ و یورو۵؛ مسیری که پالایشگاه‌های داخلی با سرمایه‌گذاری در واحدهای شکست کاتالیستی دنبال می‌کنند.",
    "طرح‌های جامع پالایش و پخش بر سه محور استوار است: تثبیت ظرفیت، ارتقای کیفیت فرآورده‌ها و کاهش پسماند سوختنی؛ هر سه در خدمت ارزش‌آفرینی بیشتر از هر بشکه نفت خام.",
    "مدیریت شبکه پخش با ابزارهای داده‌محور، ضریب اطمینان تامین مناطق پرتقاضا را بالا برده است؛ تجربه‌ای که در فصل‌های پرمصرف اهمیت دوچندان پیدا می‌کند.",
    "بر اساس گزارش‌های فنی، توسعه واحدهای تقویت اکتان و هیدروژن، دو پروژه کلیدی برای کاهش وابستگی به واردات فرآورده‌های ویژه در سال‌های آینده است.",
    "کارشناسان بازار فرآورده معتقدند هم‌ترازی استانداردهای کیفیت با الزامات محیط‌زیستی روز، شرط بقا در رقابت صادراتی منطقه‌ای است؛ هدفی که نیازمند سرمایه‌گذاری هدفمند است.",
  ],
  "bein-al-melal": [
    "نشست‌های تازه انرژی در سطح منطقه نشان می‌دهد بازیگران اصلی بازار به دنبال الگوهای همکاری بلندمدت‌اند؛ الگوهایی که از معاملات نقطه‌ای فراتر می‌رود.",
    "گزارش‌های بین‌المللی از رشد پیوسته تقاضای انرژی در بازارهای نوظهور حکایت دارد؛ روندی که بودجه توسعه میدان‌ها را در کشورهای تولیدکننده تقویت کرده است.",
    "دیپلماسی انرژی، امروز بیش از هر زمان دیگری با اقتصاد صنعت گره خورده است؛ امضای هر تفاهم‌نامه به سرعت در قیمت‌گذاری محموله‌ها و مسیرهای انتقال بازتاب می‌یابد.",
    "تحلیلگران جهانی معتقدند تعادل بازار در میان‌مدت به سه متغیر وابسته است: تصمیم‌های تولیدی ائتلاف‌های بزرگ، رشد اقتصادی آسیا و سرعت گذار انرژی در اروپا.",
    "روند سرمایه‌گذاری جهانی نشان می‌دهد سهم پروژه‌های گاز طبیعی مایع‌شده (LNG) از کل سرمایه‌گذاری بالادستی افزایش یافته است؛ نشانه‌ای از چشم‌انداز بلندمدت بازار.",
    "از نگاه نهادهای بین‌المللی، تنوع‌بخشی به مسیرهای تامین انرژی، پاسخ مشترک همه واردکنندگان بزرگ به ریسک‌های زنجیره تامین در سال‌های اخیر بوده است.",
  ],
};

const SUBHEADS: Record<string, readonly string[]> = {
  naft: ["چشم‌انداز عرضه در ماه‌های پیش رو", "نقشه رقابت در بازارهای منطقه‌ای", "متغیرهای تعیین‌کننده قیمت"],
  gas: ["تلاش شبکه برای عبور از فصل سرد", "سرمایه‌گذاری؛ گلوگاه توسعه", "مدیریت مصرف، ستون تعادل"],
  petroshimi: ["سبد صادراتی در مسیر تنوع", "خوراک؛ شرط ظرفیت پایدار", "فرصت‌های زنجیره پلیمر"],
  "palayesh-va-pakhsh": ["تثبیت ظرفیت، اولویت نخست", "کیفیت فرآورده در کانون توجه", "نقشه توسعه واحدهای پالایشی"],
  "bein-al-melal": ["همکاری‌های تازه در سطح منطقه", "چشم‌انداز بازارهای جهانی", "دیپلماسی انرژی در عمل"],
};

const QUOTES: readonly string[] = [
  "تجربه سال‌های گذشته نشان می‌دهد سرمایه‌گذاری پیوسته و برنامه‌ریزی داده‌محور، تنها مسیر پایدار برای عبور از نوسانات بازار است.",
  "بدون شفافیت قراردادها و تثبیت قواعد قیمت‌گذاری، جذب سرمایه خصوصی در زنجیره ارزش انرژی به نتیجه مطلوب نمی‌رسد.",
  "بهره‌وری انرژی، در عمل، ارزان‌ترین منبع تامین تقاضا است؛ از این رو اصلاح الگوی مصرف باید در صدر برنامه‌ها قرار گیرد.",
  "تکمیل پروژه‌های نیمه‌تمام زنجیره ارزش، سریع‌ترین راه افزایش درآمد ارزی است؛ نیازی به شروع از صفر نیست.",
  "هم‌زمانی توسعه ظرفیت تولید با ارتقای کیفیت فرآورده‌ها، معادلات رقابت صادراتی را به نفع تولیدکنندگان داخلی تغییر می‌دهد.",
];

// ---------------- body builder ----------------

const dimsCache = new Map<string, { width: number; height: number }>();

async function imgDims(relPath: string): Promise<{ width: number; height: number }> {
  const cached = dimsCache.get(relPath);
  if (cached) return cached;
  try {
    const meta = await sharp(path.join(process.cwd(), "public", relPath)).metadata();
    const d = { width: meta.width ?? 1200, height: meta.height ?? 675 };
    dimsCache.set(relPath, d);
    return d;
  } catch {
    return { width: 1200, height: 675 };
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function figureHtml(src: string, caption: string, dims: { width: number; height: number }): string {
  return `<figure><img src="${src}" alt="${esc(caption)}" width="${dims.width}" height="${dims.height}" loading="lazy" /><figcaption>${esc(caption)}</figcaption></figure>`;
}

/**
 * Rich Persian article body: intro (lead echo) → context paragraph →
 * h2 → analysis → inline figure → expert quote → h2 → second figure →
 * outlook. Composition is deterministic per slug, so re-running the seed
 * reproduces identical content.
 */
async function richBody(slug: string, lead: string, category: string): Promise<string> {
  const pool = PARA_POOLS[category] ?? PARA_POOLS.naft;
  const heads = SUBHEADS[category] ?? SUBHEADS.naft;

  const p1 = pick(slug, pool, 0);
  const p2 = pick(slug, pool, 1);
  const p3 = pick(slug, pool, 2);
  const p4 = pick(slug, pool, 3);
  const p5 = pick(slug, pool, 4);
  const quote = pick(slug, QUOTES, 0);

  const img1 = pick(slug, INLINE_POOL, 1);
  const img2 = pick(slug, INLINE_POOL, 2 + (img1 === INLINE_POOL[0] ? 1 : 0));
  const cap1 = pick(slug, INLINE_CAPTIONS, 0);
  const cap2 = pick(slug, INLINE_CAPTIONS, 2);
  const [d1, d2] = await Promise.all([imgDims(img1), imgDims(img2)]);

  return [
    `<p>${esc(lead)}</p>`,
    `<p>${esc(p1)}</p>`,
    `<h2>${esc(heads[0])}</h2>`,
    `<p>${esc(p2)}</p>`,
    figureHtml(img1, cap1, d1),
    `<p>${esc(p3)}</p>`,
    `<blockquote><p>${esc(quote)}</p></blockquote>`,
    `<h2>${esc(heads[1])}</h2>`,
    `<p>${esc(p4)}</p>`,
    figureHtml(img2, cap2, d2),
    `<p>${esc(p5)}</p>`,
    `<p>پترو تایمز ادامه این پرونده را با داده‌های به‌روز بازار و گفت‌وگو با بازیگران اصلی، در گزارش‌های بعدی دنبال خواهد کرد.</p>`,
  ].join("");
}

// ---------------- tags ----------------

const TAG_POOLS: Record<string, readonly string[]> = {
  naft: ["نفت خام", "اوپک", "بازار انرژی", "صادرات نفت", "قیمت نفت"],
  gas: ["گاز طبیعی", "شبکه گاز", "ذخیره‌سازی", "LNG", "میدان گازی"],
  petroshimi: ["پتروشیمی", "پلیمر", "خوراک", "صادرات پتروشیمی", "اولفین"],
  "palayesh-va-pakhsh": ["پالایشگاه", "فرآورده نفتی", "گازوئیل", "بنزین", "پخش فرآورده"],
  "bein-al-melal": ["بین الملل", "دیپلماسی انرژی", "بازار جهانی", "اوپک پلاس", "انرژی جهان"],
};

// ---------------- seed posts ----------------

interface SeedPost {
  slug: string;
  kicker?: string;
  title: string;
  lead: string;
  category: string; // category slug
  image?: string; // home image — /images/news/...
  imageAlt?: string;
  placements?: { section: string; position: number }[];
  views?: number;
  hoursAgo?: number;
  tags?: string[]; // defaults to 3 from the category pool
  keywords?: string; // meta keywords
}

const seedPosts: SeedPost[] = [
  // ---------- HERO (1 hero + 4 secondary) ----------
  {
    slug: "اوپک-پلاس-تصمیم-سهمیه-بهره‌برداری",
    kicker: "اوپک پلاس",
    title: "اوپک پلاس در آستانه تصمیم تازه درباره سهمیه بهره‌برداری",
    lead: "کمیته راهبردی ائتلاف اوپک پلاس قرار است در نشست آینده خود درباره میزان تولید اعضا در فصل سرد سال تصمیم‌گیری کند؛ نشستی که بازار را به انتظار نشسته است.",
    category: "naft",
    image: IMG.oil1,
    imageAlt: "جلسه ائتلاف اوپک پلاس",
    placements: [{ section: "hero", position: 1 }],
    views: 4200,
    hoursAgo: 3,
    keywords: "اوپک پلاس, سهمیه تولید, بازار نفت",
  },
  {
    slug: "بازار-نفت-در-آستانه-روند-تازه",
    title: "بازار نفت در آستانه یک روند تازه؛ تحلیلگران چه می‌گویند؟",
    lead: "نوسان‌های هفته اخیر نشان می‌دهد معامله‌گران به سناریوهای عرضه حساس‌تر شده‌اند؛ تحلیل پترو تایمز از آینده بازار.",
    category: "naft",
    image: IMG.market,
    placements: [{ section: "hero", position: 2 }],
    views: 3100,
    hoursAgo: 6,
  },
  {
    slug: "زنجیره-تامین-گاز-زمستان",
    title: "زنجیره تأمین گاز برای زمستان آماده می‌شود",
    lead: "برنامه‌ریزی برای تأمین پایدار گاز در ماه‌های سرد سال با محوریت ذخیره‌سازی و مدیریت مصرف آغاز شده است.",
    category: "gas",
    image: IMG.gas1,
    placements: [{ section: "hero", position: 3 }],
    views: 2700,
    hoursAgo: 9,
  },
  {
    slug: "صادرات-محصولات-پتروشیمی-رشد",
    title: "صادرات محصولات پتروشیمی مسیر رشد را در پیش گرفته است",
    lead: "تنوع‌بخشی به سبد صادراتی پتروشیمی، نقش پررنگ‌تری در درآمدهای ارزی پیدا کرده است.",
    category: "petroshimi",
    image: IMG.petchem1,
    placements: [{ section: "hero", position: 4 }],
    views: 2500,
    hoursAgo: 12,
  },
  {
    slug: "پالایشگاه‌ها-ظرفیت-فرآورش-پایدار",
    title: "پالایشگاه‌ها بر تثبیت ظرفیت فرآورش پایدار تمرکز کرده‌اند",
    lead: "طرح‌های توسعه‌ای پالایشی با اولویت تثبیت ظرفیت و کاهش وابستگی به واردات فرآورده پیش می‌روند.",
    category: "palayesh-va-pakhsh",
    image: IMG.refinery,
    placements: [{ section: "hero", position: 5 }],
    views: 2300,
    hoursAgo: 15,
  },

  // ---------- VIDEOS (1 player + 5 playlist) ----------
  {
    slug: "ویدیو-گزارش-تصویری-بازار-نفت",
    kicker: "پترو تایمز TV",
    title: "گزارش تصویری: مروری بر روند بازار نفت در هفته گذشته",
    lead: "ویدیویی کوتاه و جمع‌بندی‌شده از مهم‌ترین رخدادهای بازار نفت در هفته‌ای که گذشت.",
    category: "naft",
    image: IMG.oil2,
    placements: [{ section: "videos", position: 1 }],
    views: 3900,
    hoursAgo: 5,
  },
  {
    slug: "ویدیو-کارخانه-پتروشیمی-از-نزدیک",
    title: "از نزدیک با یک مجتمع پتروشیمی",
    lead: "گزارش تصویری پترو تایمز از فرآیند تولید در یکی از مجتمع‌های پتروشیمی کشور.",
    category: "petroshimi",
    image: IMG.petchem2,
    placements: [{ section: "videos", position: 2 }],
    views: 2800,
    hoursAgo: 20,
  },
  {
    slug: "ویدیو-خط-لوله-انتقال-گاز",
    title: "مسیر یک خط لوله؛ از میدان گازی تا شبکه ملی",
    lead: "مستندی کوتاه درباره مسیر انتقال گاز از میدان‌های اصلی تا شبکه سراسری.",
    category: "gas",
    image: IMG.tank,
    placements: [{ section: "videos", position: 3 }],
    views: 2200,
    hoursAgo: 26,
  },
  {
    slug: "ویدیو-پالایشگاه-در-یک-روایت",
    title: "یک پالایشگاه در یک روایت تصویری",
    lead: "مرور تصویری واحدهای اصلی فرآورش و نقش هر واحد در زنجیره ارزش پالایشی.",
    category: "palayesh-va-pakhsh",
    image: IMG.oilref,
    placements: [{ section: "videos", position: 4 }],
    views: 1900,
    hoursAgo: 32,
  },
  {
    slug: "ویدیو-میزگرد-اقتصاد-انرژی",
    title: "میزگرد اقتصاد انرژی؛ بازیگران بازار چه انتظاری دارند؟",
    lead: "گفت‌وگوی تصویری با چند فعال بازار انرژی درباره چشم‌انداز فصل پیش رو.",
    category: "bein-al-melal",
    image: IMG.meeting,
    placements: [{ section: "videos", position: 5 }],
    views: 1700,
    hoursAgo: 40,
  },
  {
    slug: "ویدیو-دستاورد-در-زنجیره-تولید",
    title: "روایت یک دستاورد در زنجیره تولید صنعتی انرژی",
    lead: "گزارش تصویری از پیشرفت یک طرح صناعتی مرتبط با زنجیره پایین‌دستی انرژی.",
    category: "petroshimi",
    image: IMG.rig,
    placements: [{ section: "videos", position: 6 }],
    views: 1500,
    hoursAgo: 48,
  },

  // ---------- TOPNEWS SIDEBAR (1 first + 3 items) ----------
  {
    slug: "قیمت-خوراک-پتروشیمی‌ها-تفاهم-تازه",
    title: "تفاهم تازه درباره قیمت‌گذاری خوراک پتروشیمی‌ها",
    lead: "گفت‌وگوها برای شفاف‌سازی مکانیسم قیمت‌گذاری خوراک واحدهای پتروشیمی وارد مرحله اجرایی شده است.",
    category: "petroshimi",
    image: IMG.deal,
    placements: [{ section: "topnews", position: 1 }],
    views: 3400,
    hoursAgo: 4,
  },
  {
    slug: "شاخص-پمپ-بنزین-و-مصرف-داخلی",
    title: "مصرف داخلی فرآورده‌ها و ضرورت مدیریت تقاضا",
    lead: "روند مصرف فرآورده‌های نفتی داخلی، بحث مدیریت تقاضا را دوباره در کانون توجه قرار داده است.",
    category: "palayesh-va-pakhsh",
    image: IMG.chart,
    placements: [{ section: "topnews", position: 2 }],
    views: 2100,
    hoursAgo: 8,
  },
  {
    slug: "تعامل-با-مشتریان-بین-المللی-انرژی",
    title: "دیپلماسی انرژی؛ تعامل تازه با مشتریان بین‌المللی",
    lead: "تحولات دیپلماسی انرژی می‌تواند نقشه راه صادرات را در ماه‌های آینده تغییر دهد.",
    category: "bein-al-melal",
    image: IMG.politics,
    placements: [{ section: "topnews", position: 3 }],
    views: 2600,
    hoursAgo: 11,
  },
  {
    slug: "نگاه-ویژه-به-بازار-فرآورده-های-نفتی",
    title: "نگاه ویژه به بازار فرآورده‌های نفتی در نیمه دوم سال",
    lead: "سناریوهای محتمل عرضه و تقاضای فرآورده‌ها در ماه‌های باقی‌مانده سال از نگاه تحلیلگران.",
    category: "naft",
    image: IMG.oil3,
    placements: [{ section: "topnews", position: 4 }],
    views: 1800,
    hoursAgo: 14,
  },

  // ---------- MAGAZINE (5 covers) ----------
  {
    slug: "مجله-پترو-تایمز-روایت-صنعت-نفت",
    kicker: "مجله",
    title: "روایت صنعت نفت؛ پرونده ویژه مجله پترو تایمز",
    lead: "شماره جدید مجله پترو تایمز به روایت تاریخی و تحلیل وضعیت صنعت نفت اختصاص یافته است.",
    category: "naft",
    image: IMG.mag1,
    imageAlt: "جلد مجله پترو تایمز",
    placements: [{ section: "magazine", position: 1 }],
    views: 2900,
    hoursAgo: 18,
  },
  {
    slug: "مجله-انرژی-و-تحول-دیجیتال",
    title: "انرژی و تحول دیجیتال؛ از سنسورها تا هوش مصنوعی",
    lead: "گزارش ویژه مجله درباره نقش فناوری‌های نوظهور در بهره‌وری صنعت انرژی.",
    category: "gas",
    image: IMG.mag2,
    placements: [{ section: "magazine", position: 2 }],
    views: 2400,
    hoursAgo: 22,
  },
  {
    slug: "مجله-سفر-به-قلب-پتروشیمی",
    title: "سفری به قلب پتروشیمی؛ در محل تولید",
    lead: "روایت میدانی مجله پترو تایمز از یک روز کاری در مجتمع پتروشیمی.",
    category: "petroshimi",
    image: IMG.mag3,
    placements: [{ section: "magazine", position: 3 }],
    views: 2000,
    hoursAgo: 28,
  },
  {
    slug: "مجله-پالایش-از-نهادینه-تا-بهینه",
    title: "پالایش؛ از فرآیند نهادینه تا بهینه‌سازی امروز",
    lead: "پرونده تخصصی مجله درباره تحول فناوری‌های پالایشی طی دهه‌های اخیر.",
    category: "palayesh-va-pakhsh",
    image: IMG.mag4,
    placements: [{ section: "magazine", position: 4 }],
    views: 1600,
    hoursAgo: 36,
  },
  {
    slug: "مجله-بازار-های-بین-المللی-انرژی",
    title: "بازارهای بین‌المللی انرژی؛ نقشه رقابت بازیگران",
    lead: "تحلیل مفصل مجله از معادلات رقابت در بازارهای جهانی نفت و گاز.",
    category: "bein-al-melal",
    image: IMG.mag5,
    placements: [{ section: "magazine", position: 5 }],
    views: 1400,
    hoursAgo: 44,
  },

  // ---------- FEATURE (3 ranked) ----------
  {
    slug: "تنوع-بخشی-به-سبد-عرضه-انرژی-ضروری-است",
    title: "تنوع‌بخشی به سبد عرضه انرژی ضروری است",
    lead: "کارشناسان بازار انرژی بر لزوم متنوع‌سازی سبد عرضه تاکید می‌کنند.",
    category: "naft",
    image: IMG.tank,
    placements: [{ section: "feature", position: 1 }],
    views: 3600,
    hoursAgo: 7,
  },
  {
    slug: "آزادگان-روایت-یک-میدان-مشترک",
    title: "آزادگان؛ روایت توسعه یک میدان مشترک در مقیاس ملی",
    lead: "پیشرفت طرح توسعه میدان‌های مشترک نشان می‌دهد مسیر سرمایه‌گذاری هموارتر شده است.",
    category: "gas",
    image: IMG.rig,
    placements: [{ section: "feature", position: 2 }],
    views: 3200,
    hoursAgo: 10,
  },
  {
    slug: "وزارت-نفت-هنر-پیدا-کردن-راه",
    title: "وزارت نفت؛ هنر پیدا کردن راه",
    lead: "تحلیل پترو تایمز از چالش‌ها و فرصت‌های پیش روی مدیریت صنعت انرژی کشور.",
    category: "bein-al-melal",
    image: IMG.meeting,
    placements: [{ section: "feature", position: 3 }],
    views: 3000,
    hoursAgo: 13,
  },

  // ---------- ENERGY (1 main + 2 subs + 3 grid) ----------
  {
    slug: "انرژی-برنامه-بهینه-سازی-مصرف",
    kicker: "انرژی",
    title: "برنامه جامع بهینه‌سازی مصرف انرژی وارد مرحله اجرا می‌شود",
    lead: "ستاد بهینه‌سازی مصرف انرژی با محوریت اصلاح الگوی مصرف، برنامه عملیاتی خود را نهایی کرده است.",
    category: "gas",
    image: IMG.gas1,
    placements: [{ section: "energy", position: 1 }],
    views: 3300,
    hoursAgo: 2,
  },
  {
    slug: "انرژی-سهم-تجدیدپذیرها-در-ترکیب-سوخت",
    title: "سهم تجدیدپذیرها در ترکیب سوخت کشور افزایش می‌یابد",
    lead: "برنامه‌ریزی برای افزایش سهم انرژی‌های تجدیدپذیر در سبد سوخت با اولویت نیروگاه‌های خورشیدی ادامه دارد.",
    category: "naft",
    image: IMG.export,
    placements: [{ section: "energy", position: 2 }],
    views: 2200,
    hoursAgo: 16,
  },
  {
    slug: "انرژی-صنایع-انرژی-بر-و-بهره‌وری",
    title: "صنایع انرژی‌بر؛ مسیر بهره‌وری با ابزار مدیریت انرژی",
    lead: "پیاده‌سازی سامانه‌های مدیریت انرژی در صنایع پرمصرف، گلوگاه اصلی بهره‌وری است.",
    category: "petroshimi",
    image: IMG.petchem2,
    placements: [{ section: "energy", position: 3 }],
    views: 1700,
    hoursAgo: 19,
  },
  {
    slug: "انرژی-قرارداد-تامین-تجهیزات-میدانی",
    title: "قرارداد تامین تجهیزات میدانی امضا شد",
    lead: "تفاهمنامه تامین تجهیزات استخراج میان اپراتورهای میدانی و سازندگان داخلی ثبت شده است.",
    category: "naft",
    image: IMG.deal,
    placements: [{ section: "advertise1", position: 1 }],
    views: 1200,
    hoursAgo: 24,
  },
  {
    slug: "انرژی-بازار-عمده-فروشی-برق-و-گاز",
    title: "بازار عمده‌فروشی برق و گاز؛ گام‌های بعدی چه خواهد بود؟",
    lead: "ساختار بازار عمده‌فروشی انرژی در آستانه بازطراحی قرار دارد.",
    category: "gas",
    image: IMG.market,
    placements: [{ section: "advertise1", position: 2 }],
    views: 1100,
    hoursAgo: 30,
  },
  {
    slug: "انرژی-مطالعه-سناریوهای-عرضه-فصل-سرد",
    title: "مطالعه سناریوهای عرضه در فصل سرد از نگاه داده‌ها",
    lead: "مدل‌سازی داده‌محور سناریوهای عرضه انرژی در ماه‌های سرد، نتیجه جالبی در بر دارد.",
    category: "bein-al-melal",
    image: IMG.chart,
    placements: [{ section: "advertise1", position: 3 }],
    views: 900,
    hoursAgo: 38,
  },

  // ---------- ADVERTISE (2 slots) ----------
  {
    slug: "پرونده-ویژه-فرصت-های-سرمایه-گذاری-انرژی",
    kicker: "تبلیغات ویژه",
    title: "پرونده ویژه: فرصت‌های سرمایه‌گذاری در زنجیره انرژی",
    lead: "مروری بر فرصت‌های سرمایه‌گذاری پویا در حلقه‌های بالادستی و پایین‌دستی صنعت انرژی.",
    category: "naft",
    image: IMG.banner,
    placements: [{ section: "advertise", position: 1 }],
    views: 2600,
    hoursAgo: 12,
  },
  {
    slug: "معرفی-خدمات-تخصصی-بازار-انرژی",
    title: "معرفی خدمات تخصصی بازیگران بازار انرژی",
    lead: "کارت معرفی خدمات شرکت‌های فعال در حوزه تامین، پایش و مشاوره بازار انرژی.",
    category: "palayesh-va-pakhsh",
    image: IMG.banner,
    placements: [{ section: "advertise", position: 2 }],
    views: 800,
    hoursAgo: 50,
  },

  // ---------- unplaced extras (category pages / latest / search) ----------
  {
    slug: "تحلیل-روز-معادلات-عرضه-نفت-خام",
    title: "تحلیل روز: معادلات عرضه نفت خام در بازارهای منطقه‌ای",
    lead: "جریان عرضه نفت خام در بازارهای منطقه‌ای وارد مرحله حساسی شده است.",
    category: "naft",
    image: IMG.oil1,
    views: 1500,
    hoursAgo: 1,
  },
  {
    slug: "گفتگو-با-بازار-سازندگان-تجهیزات-پتروشیمی",
    title: "گفت‌وگو با سازندگان داخلی تجهیزات پتروشیمی",
    lead: "سازندگان داخلی تجهیزات پتروشیمی درباره چالش‌ها و فرصت‌های پیش رو توضیح می‌دهند.",
    category: "petroshimi",
    image: IMG.petchem1,
    views: 700,
    hoursAgo: 2,
  },
  {
    slug: "گزارش-میدانی-پایانه-صادراتی-فرآورده",
    title: "گزارش میدانی از یک پایانه صادراتی فرآورده‌های نفتی",
    lead: "پایانه‌های صادراتی، آخرین حلقه زنجیره ارزش فرآورده‌ها هستند.",
    category: "palayesh-va-pakhsh",
    image: IMG.export,
    views: 650,
    hoursAgo: 3,
  },
  {
    slug: "بین-الملل-نشست-وزاری-انرژی-منطقه",
    title: "نشست وزیران انرژی منطقه؛ دستور کار توافق‌های تازه",
    lead: "نشست مشترک وزیران انرژی کشورهای منطقه با دستور کار همکاری‌های عرضه برگزار شد.",
    category: "bein-al-melal",
    image: IMG.politics,
    views: 600,
    hoursAgo: 4,
  },

  // ---------- fresh extras to fill archives / tags / search ----------
  {
    slug: "کشتی-های-تانکر-رونق-بارگیری",
    title: "تانکرها؛ رونق تازه در بارگیری محموله‌های نفتی",
    lead: "روند بارگیری محموله‌های نفتی در پایانه‌های جنوب، در هفته‌های اخیر جهش قابل توجهی داشته است.",
    category: "naft",
    image: IMG.genTanker,
    views: 950,
    hoursAgo: 5,
  },
  {
    slug: "پایانه-LNG-ظرفیت-ذخیره-دوبرابر",
    title: "پایانه LNG در مسیر دوبرابر شدن ظرفیت ذخیره",
    lead: "توسعه مخازن کروژنی پایانه صادرات LNG ظرفیت ذخیره‌سازی را در افق سه‌ساله دو برابر می‌کند.",
    category: "gas",
    image: IMG.genLng,
    views: 880,
    hoursAgo: 6,
  },
  {
    slug: "سکوهای-فشار-دریا-تولید-پایدار",
    title: "سکوهای فشار دریا؛ ستون تولید پایدار نفت خام",
    lead: "گزارش میدانی پترو تایمز از نقش سکوهای استخراج فراساحل در تثبیت تولید میدان‌های جنوبی.",
    category: "naft",
    image: IMG.genOffshore,
    views: 820,
    hoursAgo: 7,
  },
  {
    slug: "خط-لوله-انتقال-گاز-فاز-جدید",
    title: "خط لوله انتقال گاز وارد فاز جدید عملیاتی می‌شود",
    lead: "افتتاح بخش جدید خط انتقال گاز، ظرفیت حمل روزانه شبکه را در مسیر مناطق شمالی افزایش می‌دهد.",
    category: "gas",
    image: IMG.genPipeline,
    views: 760,
    hoursAgo: 9,
  },
  {
    slug: "مجتمع-پتروشیمی-زنجیره-پایین-دستی",
    title: "مجتمع پتروشیمی جدید زنجیره پایین‌دستی را کامل می‌کند",
    lead: "با راه‌اندازی واحد جدید، حلقه مفقوده زنجیره تبدیل خوراک به محصولات نهایی تکمیل می‌شود.",
    category: "petroshimi",
    image: IMG.genPetchem,
    views: 710,
    hoursAgo: 11,
  },
  {
    slug: "نشست-بین-المللی-انرژی-همکاری-منطقه",
    title: "نشست بین‌المللی انرژی؛ همکاری‌های تازه در افق منطقه",
    lead: "نشست تخصصی بازیگران انرژی منطقه با محوریت تجارت پایدار و سرمایه‌گذاری مشترک برگزار شد.",
    category: "bein-al-melal",
    image: IMG.genOpec,
    views: 680,
    hoursAgo: 13,
  },
];

// ---------------- main ----------------

async function main() {
  // 0) deterministic wipe of content tables (test data — admin/sections/categories stay)
  await prisma.postTag.deleteMany();
  await prisma.postCategory.deleteMany();
  await prisma.sectionPlacement.deleteMany();
  await prisma.post.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.media.deleteMany();
  console.log("[seed] content tables wiped (posts, tags, media, placements)");

  // 1) categories
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, order: c.order },
      create: c,
    });
  }
  console.log(`Categories: ${categories.length} upserted`);

  // 2) home sections
  for (const s of homeSections) {
    await prisma.homeSection.upsert({
      where: { key: s.key },
      update: { name: s.name, capacity: s.capacity },
      create: s,
    });
  }
  console.log(`Home sections: ${homeSections.length} upserted`);

  // 3) admin user (existing admin keeps its password)
  const email = process.env.ADMIN_EMAIL || "admin@petrotimes.ir";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD env var is required to seed the initial admin user");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: "مدیر سایت" },
  });
  console.log(`Admin user: ${email} upserted (existing password untouched)`);

  // 4) media + posts + placements + tags
  const catBySlug = new Map(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id])
  );
  const sectionByKey = new Map(
    (await prisma.homeSection.findMany()).map((s) => [s.key, s.id])
  );

  async function upsertMedia(key: string, relPath: string, alt: string): Promise<string> {
    const filePath = path.join(process.cwd(), "public", relPath);
    let size = 0;
    try {
      size = fs.statSync(filePath).size;
    } catch {
      // file missing — still seed the record with size 0
    }
    let width: number | null = null;
    let height: number | null = null;
    try {
      const meta = await sharp(filePath).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      // dims are optional metadata
    }
    const mimeType = relPath.endsWith(".png") ? "image/png" : "image/jpeg";
    const media = await prisma.media.upsert({
      where: { key },
      update: { url: relPath, mimeType, alt, width, height },
      create: {
        key,
        url: relPath,
        provider: "local",
        kind: "image",
        mimeType,
        size,
        width,
        height,
        alt,
      },
    });
    return media.id;
  }

  let created = 0;

  for (const p of seedPosts) {
    const publishedAt = new Date(Date.now() - (p.hoursAgo ?? 24) * 3_600_000);
    const body = await richBody(p.slug, p.lead, p.category);

    const homeImageId = p.image
      ? await upsertMedia(p.slug, p.image, p.imageAlt || p.title)
      : null;

    // distinct inner image (article hero) — never the same row as home image
    const innerSrc = pick(`${p.slug}-inner`, INLINE_POOL, 3 + (p.image ? INLINE_POOL.indexOf(p.image as never) % 5 : 0));
    const innerImageId = await upsertMedia(`${p.slug}__inner`, innerSrc, `تصویر خبر ${p.title}`);

    const metaTitle = `${p.title} | پترو تایمز`;
    const metaDescription = p.lead.slice(0, 155);
    const metaKeywords = p.keywords ?? (p.tags ?? TAG_POOLS[p.category]).slice(0, 3).join(", ");

    const post = await prisma.post.create({
      data: {
        slug: p.slug,
        kicker: p.kicker ?? null,
        title: p.title,
        lead: p.lead,
        body,
        categoryId: catBySlug.get(p.category)!,
        homeImageId,
        homeImageAlt: p.imageAlt || "",
        innerImageId,
        innerImageAlt: `تصویر خبر ${p.title}`,
        status: "PUBLISHED",
        publishedAt,
        views: p.views ?? 100,
        hasOwnPage: true,
        metaTitle,
        metaDescription,
        metaKeywords,
      },
    });

    // tags — 3 deterministic picks from the category pool (deduped)
    const tagNames = Array.from(new Set(p.tags ?? [
      pick(p.slug, TAG_POOLS[p.category], 0),
      pick(p.slug, TAG_POOLS[p.category], 1),
      pick(p.slug, TAG_POOLS[p.category], 2),
    ]));
    for (const name of tagNames) {
      const slug = name.replace(/\s+/g, "-");
      const tag = await prisma.tag.upsert({
        where: { slug },
        update: {},
        create: { name, slug },
      });
      await prisma.postTag.create({ data: { postId: post.id, tagId: tag.id } });
    }

    for (const pl of p.placements ?? []) {
      const sectionId = sectionByKey.get(pl.section);
      if (!sectionId) throw new Error(`Unknown section key: ${pl.section}`);
      await prisma.sectionPlacement.create({
        data: { postId: post.id, sectionId, position: pl.position },
      });
    }
    created++;
  }

  console.log(`Posts: ${created} created (each with home + inner images, rich body, tags, meta)`);
  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
