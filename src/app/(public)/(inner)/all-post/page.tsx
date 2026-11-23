import type { Metadata } from "next";
import { ArchiveSidebar, ArchiveView } from "@/components/petro/Inner";
import { getAllPosts } from "@/lib/content/queries";
import { absoluteUrl, rssAlternates } from "@/lib/site";
import { archiveGraph, archiveBreadcrumbs } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/petro/JsonLd";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "همه اخبار",
  description: "آخرین اخبار و تحلیل‌های انرژی — همه مطالب منتشرشده.",
  alternates: {
    canonical: "/all-post",
    types: rssAlternates.types,
  },
};

export default async function AllPostPage() {
  const data = await getAllPosts(1);

  return (
    <div className="pt-section">
      <JsonLd
        graph={archiveGraph(
          {
            url: absoluteUrl("/all-post"),
            name: "همه اخبار",
            description: "آخرین اخبار و تحلیل‌های انرژی — همه مطالب منتشرشده.",
          },
          archiveBreadcrumbs("همه اخبار", "/all-post")
        )}
      />
      <ArchiveView
        label="همه اخبار"
        count={`${data.totalItems.toLocaleString("fa-IR")} خبر`}
        page={1}
        totalPages={data.totalPages}
        items={data.items}
        makeHref={(p) => (p <= 1 ? "/all-post" : `/all-post/page/${p}`)}
        sidebar={<ArchiveSidebar />}
        emptyMessage="هنوز خبری منتشر نشده است."
      />
    </div>
  );
}
