import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchiveSidebar, ArchiveView } from "@/components/petro/Inner";
import { getTagBySlug, getTagPosts } from "@/lib/content/queries";
import { absoluteUrl, rssAlternates } from "@/lib/site";
import { archiveGraph, archiveBreadcrumbs } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/petro/JsonLd";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(decodeURIComponent(slug));
  if (!tag) return {};
  return {
    title: `برچسب: ${tag.name}`,
    alternates: {
      canonical: `/tag/${tag.slug}`,
      types: rssAlternates.types,
    },
  };
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const tag = await getTagBySlug(decodedSlug);
  if (!tag) notFound();

  const data = await getTagPosts(tag.id, 1);
  const tagLabel = `برچسب: ${tag.name}`;

  return (
    <div className="pt-section">
      <JsonLd
        graph={archiveGraph(
          { url: absoluteUrl(`/tag/${tag.slug}`), name: tagLabel },
          archiveBreadcrumbs(tagLabel, `/tag/${tag.slug}`)
        )}
      />
      <ArchiveView
        label={tagLabel}
        count={`${data.totalItems.toLocaleString("fa-IR")} خبر`}
        page={1}
        totalPages={data.totalPages}
        items={data.items}
        makeHref={(p) => (p <= 1 ? `/tag/${tag.slug}` : `/tag/${tag.slug}/page/${p}`)}
        sidebar={<ArchiveSidebar />}
        emptyMessage="هنوز خبری با این برچسب منتشر نشده است."
      />
    </div>
  );
}
