import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchiveSidebar, ArchiveView } from "@/components/petro/Inner";
import {
  getCategoryBySlug,
  getCategoryPosts,
} from "@/lib/content/queries";
import { absoluteUrl, rssAlternates, siteName } from "@/lib/site";
import { archiveGraph, archiveBreadcrumbs } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/petro/JsonLd";

// archive pages are ISR-cached; new posts appear within 60s
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(decodeURIComponent(slug));
  if (!category) return {};
  return {
    title: category.name,
    description: `آخرین اخبار ${category.name} — ${siteName}`,
    alternates: {
      canonical: `/category/${category.slug}`,
      types: rssAlternates.types,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const category = await getCategoryBySlug(decodedSlug);
  if (!category) notFound();

  const data = await getCategoryPosts(category.id, 1);
  const count =
    data.totalItems > 0 ? `${data.totalItems.toLocaleString("fa-IR")} خبر` : undefined;

  return (
    <div className="pt-section">
      <JsonLd
        graph={archiveGraph(
          {
            url: absoluteUrl(`/category/${category.slug}`),
            name: category.name,
            description: `آخرین اخبار ${category.name} — ${siteName}`,
          },
          archiveBreadcrumbs(category.name, `/category/${category.slug}`)
        )}
      />
      <ArchiveView
        label={category.name}
        count={count}
        page={1}
        totalPages={data.totalPages}
        items={data.items}
        makeHref={(p) => (p <= 1 ? `/category/${category.slug}` : `/category/${category.slug}/page/${p}`)}
        sidebar={<ArchiveSidebar />}
        emptyMessage="هنوز خبری در این دسته منتشر نشده است."
      />
    </div>
  );
}
