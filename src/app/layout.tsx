import type { Metadata, Viewport } from "next";
import { iransans } from "@/lib/fonts";
import {
  siteDescription,
  siteName,
  siteNameEn,
  siteKeywords,
  siteTwitterHandle,
  siteUrl,
} from "@/lib/site";
import "./globals-petro-base.css";

/**
 * Root layout — shell only: html/body, IRANSans via next/font, brand-level
 * metadata. Styling is split per subtree so the pixel-perfect public site
 * keeps its own cascade (petro.css, no framework preflight) while the admin
 * panel keeps the Tailwind/shadcn design system (globals.css).
 *
 * globals-petro-base.css is a tiny neutral base (no preflight) shared by
 * both subtrees: box-sizing + smooth scrolling + color-scheme.
 */

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} - ${siteNameEn}`,
    template: `%s - ${siteName}`,
  },
  description: siteDescription,
  keywords: siteKeywords,
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: siteUrl,
    siteName: `${siteNameEn} | ${siteName}`,
  },
  // Rank Math directives: full snippets + large image previews for Google.
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  twitter: {
    site: siteTwitterHandle,
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* Typography spec: html lang="fa" dir="rtl"; IRANSans next/font/local
       classes (variable --font-iransans + generated family) sit on <html> so
       every subtree (public petro.css + admin tailwind) inherits the
       self-hosted weights. */
    <html lang="fa" dir="rtl" className={`${iransans.variable} ${iransans.className}`}>
      <body>{children}</body>
    </html>
  );
}
