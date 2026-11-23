import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchiveSidebar, ArchiveView } from "@/components/petro/Inner";
import { getCategoryBySlug, getCategoryPosts } from "@/lib/content/queries";
import { absoluteUrl, rssAlternates } from "@/lib/site";
import { faDigits } from "@/lib/post-format";
import { archiveGraph, archiveBreadcrumbs } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/petro/JsonLd";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  const category = await getCategoryBySlug(decodeURIComponent(slug));
  if (!category) return {};
  const n = Math.max(1, parseInt(page, 10) || 1);
  return {
    title: `${category.name} - صفحه ${faDigits(n)}`,
    alternates: {
      canonical: `/category/${category.slug}/page/${n}`,
      types: rssAlternates.types,
    },
  };
}

export default async function CategoryPaginatedPage({ params }: Props) {
  const { slug, page } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const n = Math.max(1, parseInt(page, 10) || 1);
  const category = await getCategoryBySlug(decodedSlug);
  if (!category) notFound();

  const data = await getCategoryPosts(category.id, n);
  // out-of-range page → real 404 (empty page ≠ valid URL for crawlers)
  if (n > data.totalPages) notFound();

  return (
    <div className="pt-section">
      <JsonLd
        graph={archiveGraph(
          {
            url: absoluteUrl(`/category/${category.slug}/page/${n}`),
            name: `${category.name} - صفحه ${faDigits(n)}`,
          },
          [
            { label: "خانه", href: "/" },
            { label: category.name, href: `/category/${category.slug}` },
            { label: `صفحه ${faDigits(n)}` },
          ]
        )}
      />
      <ArchiveView
        label={category.name}
        count={`${data.totalItems.toLocaleString("fa-IR")} خبر`}
        page={n}
        totalPages={data.totalPages}
        items={data.items}
        makeHref={(p) => (p <= 1 ? `/category/${category.slug}` : `/category/${category.slug}/page/${p}`)}
        sidebar={<ArchiveSidebar />}
        emptyMessage="هنوز خبری در این دسته منتشر نشده است."
      />
    </div>
  );
}
