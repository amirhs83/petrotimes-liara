import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * Dynamic robots.txt (Rank Math parity) — crawlers may index everything
 * except the admin panel; both the sitemap index and the Google News
 * sitemap are advertised.
 */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/admin/"],
      },
    ],
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/news-sitemap.xml`],
  };
}
