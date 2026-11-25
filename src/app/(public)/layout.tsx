import type { Metadata } from "next";
import "../petro.css";
import "../petro-desktop-ux.css";
import { siteDescription, siteName, siteNameEn, siteUrl } from "@/lib/site";

/**
 * Public site layout — the PetroTimes pixel-perfect subtree.
 * petro.css is imported ONLY here (and in standalone pages like not-found):
 * the admin panel keeps Tailwind globals, so neither cascade pollutes the
 * other. The Barlow/ts-icons preloads reproduce the live chrome.
 *
 * SEO: the Organization + WebSite(+SearchAction) nodes are NOT emitted here —
 * every page assembles its complete Rank Math-style @graph (which always
 * includes those base nodes) so exactly one JSON-LD block reaches the DOM.
 */

export const metadata: Metadata = {
  description: siteDescription,
  alternates: {
    canonical: siteUrl,
    types: { "application/rss+xml": `${siteUrl}/feed.xml` },
  },
  openGraph: {
    title: `${siteName} - ${siteNameEn}`,
    description: siteDescription,
    url: siteUrl,
    siteName: `${siteNameEn} | ${siteName}`,
    type: "website",
    locale: "fa_IR",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: `${siteNameEn} ${siteName}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} - ${siteNameEn}`,
    description: siteDescription,
    images: ["/og-default.png"],
  },
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Latin UI font + icon font preloads — part of the live chrome */}
      <link rel="preload" href="/assets/fonts/Barlow-400-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      <link rel="preload" href="/assets/fonts/Barlow-600-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      <link rel="preload" href="/assets/fonts/ts-icons.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      {children}
    </>
  );
}
