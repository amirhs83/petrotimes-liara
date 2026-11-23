import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchiveSidebar, ArchiveView } from "@/components/petro/Inner";
import { getTagBySlug, getTagPosts } from "@/lib/content/queries";
import { absoluteUrl, rssAlternates } from "@/lib/site";
import { faDigits } from "@/lib/post-format";
import { archiveGraph, archiveBreadcrumbs } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/petro/JsonLd";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  const tag = await getTagBySlug(decodeURIComponent(slug));
  if (!tag) return {};
  const n = Math.max(1, parseInt(page, 10) || 1);
  return {
    title: `برچسب: ${tag.name} - صفحه ${faDigits(n)}`,
    alternates: {
      canonical: `/tag/${tag.slug}/page/${n}`,
      types: rssAlternates.types,
    },
  };
}

export default async function TagPaginatedPage({ params }: Props) {
  const { slug, page } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const n = Math.max(1, parseInt(page, 10) || 1);
  const tag = await getTagBySlug(decodedSlug);
  if (!tag) notFound();

  const data = await getTagPosts(tag.id, n);
  if (n > data.totalPages) notFound();
  const tagLabel = `برچسب: ${tag.name}`;

  return (
    <div className="pt-section">
      <JsonLd
        graph={archiveGraph(
          {
            url: absoluteUrl(`/tag/${tag.slug}/page/${n}`),
            name: `${tagLabel} - صفحه ${faDigits(n)}`,
          },
          [
            { label: "خانه", href: "/" },
            { label: tagLabel, href: `/tag/${tag.slug}` },
            { label: `صفحه ${faDigits(n)}` },
          ]
        )}
      />
      <ArchiveView
        label={tagLabel}
        count={`${data.totalItems.toLocaleString("fa-IR")} خبر`}
        page={n}
        totalPages={data.totalPages}
        items={data.items}
        makeHref={(p) => (p <= 1 ? `/tag/${tag.slug}` : `/tag/${tag.slug}/page/${p}`)}
        sidebar={<ArchiveSidebar />}
        emptyMessage="هنوز خبری با این برچسب منتشر نشده است."
      />
    </div>
  );
}
