import localFont from 'next/font/local';

/**
 * IRANSans — the site's Persian typography (client typography spec, matched
 * to the bimehnews reference).
 *
 * The four static FontIran web files (IRANSansWeb v4.20) are self-hosted by
 * next/font/local (copied to hashed /_next/static/media paths at build time):
 *   IRANSansWeb_Light.woff2   → 300
 *   IRANSansWeb.woff2         → 400
 *   IRANSansWeb_Medium.woff2  → 500
 *   IRANSansWeb_Bold.woff2    → 700
 * Each weight renders from its REAL file (fontTools-verified usWeightClass
 * 300/400/500/700, no fvar) — the Regular file is never synthetically
 * thickened. display:swap + preload:true + adjustFontFallback:'Arial' per
 * the spec; the generated font-family is exposed as --font-iransans so
 * petro.css can build the required chain:
 *   font-family: var(--font-iransans), Tahoma, Arial, sans-serif
 */
export const iransans = localFont({
  src: [
    { path: '../fonts/IRANSansWeb_Light.woff2', weight: '300', style: 'normal' },
    { path: '../fonts/IRANSansWeb.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/IRANSansWeb_Medium.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/IRANSansWeb_Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-iransans',
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Arial',
  fallback: ['Tahoma', 'Arial', 'sans-serif'],
});
