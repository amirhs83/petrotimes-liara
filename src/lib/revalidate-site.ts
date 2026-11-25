import { revalidatePath } from "next/cache";
import { invalidateHomepageCache } from "@/lib/content";

/** Immediately refreshes homepage & archive caches after any CMS write. */
export function revalidatePublicSite(slug?: string | null) {
  invalidateHomepageCache();
  try {
    revalidatePath("/");
    revalidatePath("/all-post");
    if (slug) {
      revalidatePath(`/news/${slug}`);
      revalidatePath(`/news/${encodeURIComponent(slug)}`);
    }
  } catch {
    // Non-fatal outside request context
  }
}
