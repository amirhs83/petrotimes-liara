import type { Metadata } from "next";
import { ArchiveSidebar, ArchiveView } from "@/components/petro/Inner";
import { searchPosts, splitQuery } from "@/lib/content/queries";
import { rssAlternates } from "@/lib/site";

type Props = { searchParams: Promise<{ s?: string; page?: string }> };

// search results must never be indexed (Rank Math behavior)
export const metadata: Metadata = {
  title: "نتایج جستجو",
  robots: { index: false, follow: true },
  alternates: {
    canonical: "/search",
    types: rssAlternates.types,
  },
};

export default async function SearchPage({ searchParams }: Props) {
  const { s, page } = await searchParams;
  const query = (s ?? "").trim().slice(0, 100);
  const n = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const data = await searchPosts(query, n);
  const words = splitQuery(query).length;

  const label = query ? "نتایج جستجو برای" : "جستجو";

  const searchParamsSuffix = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("s", query);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  };

  return (
    <ArchiveView
      label={label}
      searchTerm={query || undefined}
      count={query && words > 0 ? `${data.totalItems.toLocaleString("fa-IR")} نتیجه` : undefined}
      page={n}
      totalPages={data.totalPages}
      items={data.items}
      makeHref={searchParamsSuffix}
      sidebar={<ArchiveSidebar />}
      emptyMessage={
        query
          ? "موردی مطابق جستجوی شما پیدا نشد. عبارت کوتاه‌تر یا دیگری را امتحان کنید."
          : "برای جستجو، عبارت مورد نظر را در نوار جستجوی بالای سایت وارد کنید."
      }
    />
  );
}
