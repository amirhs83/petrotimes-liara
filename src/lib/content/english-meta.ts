/**
 * English metadata derivation for the FEATURED NEWS block.
 *
 * Converts the site's Persian Jalali date line (`dateText`, e.g.
 * "۲۹ مرداد ۱۴۰۵ - ۰۹:۰۴") into the English editorial forms used by the
 * featured-news meta row: date "AUG 20, 2026" (3-letter month) and time
 * "9:04 AM" (12-hour clock). The clock time is kept exactly as the site
 * displays it (site timezone) — only the calendar system changes.
 *
 * Jalali → Gregorian conversion is done through the ICU Persian calendar
 * (`Intl.DateTimeFormat` with `ca-persian`) via an inverse day-search — the
 * same calendar data the platform itself uses. Verified anchors:
 *   ۲۹ مرداد ۱۴۰۵ → AUG 20 2026,  ۱ فروردین ۱۴۰۴ → MAR 21 2025,
 *   ۱ فروردین ۱۳۸۳ → MAR 20 2004.
 *
 * Category names are mapped to their English section labels using the site's
 * OWN taxonomy (header navigation / section slugs). Nothing is fabricated:
 * an unmapped category or an unparseable date returns null and the caller
 * simply omits that meta segment.
 */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
] as const;
const EN_MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;
const DAY_MS = 86_400_000;

/** Site taxonomy (header nav / section categories) → English meta label. */
const CATEGORY_EN: Record<string, string> = {
  'بین الملل': 'INTERNATIONAL',
  'نفت': 'OIL',
  'گاز': 'GAS',
  'پتروشیمی': 'PETROCHEMICALS',
  'پالایش و پخش': 'REFINING & DISTRIBUTION',
  'انرژی': 'ENERGY',
  'مجله': 'MAGAZINE',
};

function faToEnDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
}

/**
 * Gregorian UTC date whose ICU Persian (Jalali) representation is the given
 * (jy, jm, jd). Rough anchor ≈ 1 Farvardin of the same Jalali year, corrected
 * by the true Jalali day-of-year, then an exact ±5-day window scan (covers
 * leap-year / cross-year drift). Returns null for invalid input or a platform
 * without ICU Persian support.
 */
export function persianToGregorianUtc(jy: number, jm: number, jd: number): Date | null {
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31 || jy < 1) return null;
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return null;
  }
  const jalaliDoy = (m: number, d: number) =>
    m <= 6 ? (m - 1) * 31 + d : 186 + (m - 7) * 30 + d;
  const read = (t: Date) => {
    const parts = fmt.formatToParts(t);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value);
    return { y: get('year'), m: get('month'), d: get('day') };
  };
  const anchor = new Date(Date.UTC(jy + 621, 2, 25));
  const a = read(anchor);
  const delta = (jy - a.y) * 365 + (jalaliDoy(jm, jd) - jalaliDoy(a.m, a.d));
  const estimate = new Date(anchor.getTime() + delta * DAY_MS);
  for (let off = -5; off <= 5; off++) {
    const t = new Date(estimate.getTime() + off * DAY_MS);
    const p = read(t);
    if (p.y === jy && p.m === jm && p.d === jd) return t;
  }
  return null;
}

export interface EnglishMeta {
  /** Uppercase English category label, or null when unmapped. */
  category: string | null;
  /** "AUG 20, 2026" — or null when the date line cannot be parsed. */
  date: string | null;
  /** "9:04 AM" — or null when the date line cannot be parsed. */
  time: string | null;
}

/**
 * "NOV 23, 2026 • 02:59 PM" from a Persian dateText — the shared Top News
 * meta recipe (Gregorian date + zero-padded 12-hour clock, • separator).
 * Used by the mobile Top News rows, the TV swap line and the in-slot English
 * date swap (feature title / energy / article meta). Returns null when the
 * date line cannot be parsed.
 */
export function topNewsDateLine(dateText: string): string | null {
  const meta = englishMeta(dateText, null);
  const line = [meta.date, meta.time ? meta.time.replace(/^(\d):/, '0$1:') : '']
    .filter(Boolean)
    .join(' • ');
  return line || null;
}

export function englishMeta(dateText: string, category: string | null): EnglishMeta {
  const norm = (category ?? '').replace(/\s+/g, ' ').trim();
  const categoryEn = norm ? CATEGORY_EN[norm] ?? null : null;

  let date: string | null = null;
  let time: string | null = null;
  const m = faToEnDigits(dateText).match(
    /(\d{1,2})\s+([\u0600-\u06FF]+)\s+(\d{3,4})\s*-\s*(\d{1,2}):(\d{2})/
  );
  if (m) {
    const jm = JALALI_MONTHS.indexOf(m[2] as (typeof JALALI_MONTHS)[number]);
    if (jm >= 0) {
      const g = persianToGregorianUtc(Number(m[3]), jm + 1, Number(m[1]));
      if (g) {
        const gd = g.getUTCDate();
        const gy = g.getUTCFullYear();
        date = `${EN_MONTHS[g.getUTCMonth()]} ${gd}, ${gy}`;
      }
    }
    let hh = Number(m[4]);
    const suffix = hh >= 12 ? 'PM' : 'AM';
    hh %= 12;
    if (hh === 0) hh = 12;
    time = `${hh}:${m[5]} ${suffix}`;
  }

  return { category: categoryEn, date, time };
}
