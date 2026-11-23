import type { HomepageData } from './types';
import snapshot from '@/data/homepage-data.json';

/**
 * Fixed content snapshot (test environment source).
 * This is the exact content captured from the live site on 2026-11-15 —
 * titles, dates, links and the actually-applied image variants.
 */
export function getSnapshot(): HomepageData {
  return snapshot as unknown as HomepageData;
}
