import type { HomepageData } from './types';
import { getSnapshot } from './snapshot';
import { buildHomepageData, newsletterBlock } from './cms';

export { newsletterBlock };

export type {
  Article,
  FeatureArticle,
  FooterData,
  HomepageData,
  MarketQuote,
  MenuItem,
  NewsletterData,
  SocialLink,
  TickerItem,
} from './types';

export type ContentMode = 'cms' | 'snapshot';

/**
 * Homepage data source selector.
 *
 *  - 'cms' (default): assembles the homepage from the local CMS (Prisma) via
 *    src/lib/content/cms.ts, producing the same contract as the remote
 *    adapter of the original PetroTimes frontend. The last fully-successful
 *    payload is kept in memory; if a regeneration fails, the previous
 *    payload keeps serving (stale-while-error) so the homepage never breaks.
 *  - 'snapshot': the fixed content captured from the reference site —
 *    deterministic, used by visual-regression tests. Works with zero
 *    configuration (CONTENT_API_MODE=snapshot).
 *
 * Resilience rule (docs/API-CONTRACT.md): a broken backend never produces a
 * blank page. Order: CMS → lastGood → snapshot → throw.
 */
let lastGood: HomepageData | null = null;
let lastGoodAt = 0;
const HOMEPAGE_CACHE_TTL_MS = 30_000;

/** Clears the in-memory homepage cache so admin changes publish immediately. */
export function invalidateHomepageCache() {
  lastGoodAt = 0;
}

export async function getHomepageData(): Promise<HomepageData> {
  const mode = (process.env.CONTENT_API_MODE as ContentMode | undefined) ?? 'cms';

  if (mode === 'snapshot') return getSnapshot();

  const now = Date.now();
  if (lastGood && now - lastGoodAt < HOMEPAGE_CACHE_TTL_MS) {
    return lastGood;
  }

  try {
    const data = await buildHomepageData();
    const hasContent =
      Boolean(data.sections.heroMain?.title) ||
      data.sections.footer.latest.length > 0;
    if (hasContent) {
      lastGood = data;
      lastGoodAt = now;
    }
    return data;
  } catch (err) {
    console.error('[content] CMS build failed:', err);
    if (lastGood) {
      console.warn('[content] serving last known good homepage payload');
      return lastGood;
    }
    console.warn('[content] falling back to bundled snapshot');
    return getSnapshot();
  }
}
