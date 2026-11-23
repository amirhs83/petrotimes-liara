'use client';

import { useEffect, useState } from 'react';

/**
 * Article view counter — renders the current count and pings
 * POST /api/view/[slug] once per mount. The API rate-limits and dedupes
 * (one counted view per IP+slug per hour), so refreshes never inflate it.
 * No icon glyph: the ts-icons v3.2 build ships no eye codepoint, so the
 * meta item is text-only (matches the Barlow meta row).
 */
export function ViewCounter({ slug, initialViews }: { slug: string; initialViews: number }) {
  const [views, setViews] = useState(initialViews);

  useEffect(() => {
    let alive = true;
    fetch(`/api/view/${encodeURIComponent(slug)}`, { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { ok?: boolean; views?: number } | null) => {
        if (alive && data?.ok && typeof data.views === 'number') setViews(data.views);
      })
      .catch(() => {
        /* counter is decorative — network failures must never surface */
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <span className="meta-item views">
      <span className="views-link">{views.toLocaleString('fa-IR')} بازدید</span>
    </span>
  );
}
