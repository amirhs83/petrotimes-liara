import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchiveSidebar, ArchiveView } from "@/components/petro/Inner";
import { getAllPosts } from "@/lib/content/queries";
import { absoluteUrl, rssAlternates } from "@/lib/site";
import { faDigits } from "@/lib/post-format";
import { archiveGraph, archiveBreadcrumbs } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/petro/JsonLd";

export const revalidate = 60;

type Props = { params: Promise<{ page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  const n = Math.max(1, parseInt(page, 10) || 1);
  return {
    title: `همه اخبار - صفحه ${faDigits(n)}`,
    alternates: {
      canonical: `/all-post/page/${n}`,
      types: rssAlternates.types,
    },
  };
}

export default async function AllPostPaginatedPage({ params }: Props) {
  const { page } = await params;
  const n = Math.max(1, parseInt(page, 10) || 1);
  const data = await getAllPosts(n);
  if (n > data.totalPages) notFound();

  return (
    <div className="pt-section">
      <JsonLd
        graph={archiveGraph(
          {
            url: absoluteUrl(`/all-post/page/${n}`),
            name: `همه اخبار - صفحه ${faDigits(n)}`,
          },
          [
            { label: "خانه", href: "/" },
            { label: "همه اخبار", href: "/all-post" },
            { label: `صفحه ${faDigits(n)}` },
          ]
        )}
      />
      <ArchiveView
        label="همه اخبار"
        count={`${data.totalItems.toLocaleString("fa-IR")} خبر`}
        page={n}
        totalPages={data.totalPages}
        items={data.items}
        makeHref={(p) => (p <= 1 ? "/all-post" : `/all-post/page/${p}`)}
        sidebar={<ArchiveSidebar />}
        emptyMessage="هنوز خبری منتشر نشده است."
      />
    </div>
  );
}
