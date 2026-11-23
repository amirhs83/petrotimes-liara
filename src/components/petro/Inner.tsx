import type { Article } from '@/lib/content';
import type { ArchiveItem } from '@/lib/content/queries';
import { getSidebarArticles } from '@/lib/content/queries';
import { newsletterBlock } from '@/lib/content/cms';
import { SmallPostCard } from './PostCards';
import { PostMeta, Icon } from './Primitives';
import { NewsletterWidget } from './NewsletterWidget';
import type { NewsletterData } from '@/lib/content';

/**
 * Shared inner-page building blocks (article / archive / search / static).
 * All markup reuses the live design language: block-head chips, the
 * small-post card recipe and the Barlow meta row from petro.css.
 */

/* ------------------------------------------------------------ breadcrumbs */

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="pt-breadcrumb" aria-label="Breadcrumb">
      <ul>
        {items.map((c, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i}>
              {c.href && !isLast ? (
                <a href={c.href}>{c.label}</a>
              ) : (
                <span className={isLast ? 'current' : undefined} aria-current={isLast ? 'page' : undefined}>
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ----------------------------------------------------------- archive head */

/**
 * Archive/search page title bar — the block-head-e2 editorial style
 * (heading + 2px line + optional count). The line is an explicit flex
 * child here so the count chip can sit at the far end of the row.
 */
export function ArchiveHead({
  label,
  count,
  searchTerm,
}: {
  label: string;
  /** formatted (Persian digits) result count — rendered only when provided */
  count?: string;
  /** highlighted search term inside the label */
  searchTerm?: string;
}) {
  return (
    <div className="pt-block-head pt-block-head-e pt-block-head-e2 is-left pt-archive-head">
      <h1 className="heading">
        {searchTerm ? (
          <>
            {label} <span className="pt-search-term">«{searchTerm}»</span>
          </>
        ) : (
          label
        )}
      </h1>
      <span className="pt-head-line" aria-hidden="true" />
      {count ? <span className="pt-count">{count}</span> : null}
    </div>
  );
}

/* ---------------------------------------------------------- archive rows */

function rowToArticle(item: ArchiveItem): Article {
  return {
    title: item.title,
    url: `/news/${encodeURIComponent(item.slug)}`,
    dateText: item.dateText,
    category: item.category.name || null,
    categoryUrl: item.category.slug ? `/category/${item.category.slug}` : null,
    excerpt: null,
    image: item.image,
    imageFull: item.image,
  };
}

/** Archive list row — the standard small-post card with its category chip. */
export function ArchiveRow({ item }: { item: ArchiveItem }) {
  const a = rowToArticle(item);
  return (
    <article className="pt-small-post pt-clamp">
      <div className="pt-media">
        <a href={a.url} className="pt-media-link" title={item.title} aria-label={item.title}>
          <span className="pt-media-ratio pt-ratio-thumb">
            <span
              className="pt-bg-cover"
              style={{ backgroundImage: `url("${a.image ?? ''}")`, position: 'absolute', top: 0, right: 0 } as React.CSSProperties}
            />
          </span>
        </a>
      </div>
      <div className="pt-content">
        <h3 className="pt-post-title">
          <a href={a.url}>{item.title}</a>
        </h3>
        <PostMeta category={a.category} categoryUrl={a.categoryUrl} dateText={a.dateText} />
      </div>
    </article>
  );
}

/** Page-1 hero of an archive — the big image-top card (HighlightsHero recipe). */
export function ArchiveHero({ item }: { item: ArchiveItem }) {
  const a = rowToArticle(item);
  return (
    <article className="pt-archive-hero">
      <div className="pt-media">
        <a href={a.url} className="pt-image-link" title={item.title} aria-label={item.title}>
          <span className="pt-media-ratio pt-ratio-16-9">
            <span
              className="pt-bg-cover"
              style={{ backgroundImage: `url("${a.image ?? ''}")`, position: 'absolute', top: 0, right: 0 } as React.CSSProperties}
            />
          </span>
        </a>
      </div>
      <div className="pt-content">
        <h2 className="pt-post-title">
          <a href={a.url}>{item.title}</a>
        </h2>
        <PostMeta category={a.category} categoryUrl={a.categoryUrl} dateText={a.dateText} />
        {item.lead ? (
          <div className="pt-excerpt">
            <p>{item.lead}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function ArchiveEmpty({ message }: { message: string }) {
  return <div className="pt-archive-empty">{message}</div>;
}

/* ----------------------------------------------------------- pagination -- */

/**
 * SmartMag pagination — 40px bordered squares, current page solid black.
 * RTL semantics: قبلی points right (back), بعدی points left (forward).
 * Windowed number list with ellipses (1 … around(page) … last).
 */
function pageWindow(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) out.push('…');
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push('…');
  out.push(total);
  return out;
}

export function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  /** builds the URL of a page number (page ≥ 2 usually appends /page/N) */
  makeHref: (p: number) => string;
}) {
  if (totalPages <= 1) return null;
  const prev = page > 1 ? makeHref(page - 1) : null;
  const next = page < totalPages ? makeHref(page + 1) : null;
  return (
    <nav className="pt-pagination" aria-label="صفحه‌بندی">
      {prev ? (
        <a href={prev} aria-label="صفحه قبلی" className="pt-page-prev">
          <Icon name="angleRight" />
        </a>
      ) : (
        <span className="is-disabled pt-page-prev" aria-hidden="true">
          <Icon name="angleRight" />
        </span>
      )}
      {pageWindow(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="pt-page-ellipsis" aria-hidden="true">
            …
          </span>
        ) : p === page ? (
          <span key={p} className="is-current" aria-current="page">
            {p.toLocaleString('fa-IR')}
          </span>
        ) : (
          <a key={p} href={makeHref(p)}>
            {p.toLocaleString('fa-IR')}
          </a>
        )
      )}
      {next ? (
        <a href={next} aria-label="صفحه بعدی" className="pt-page-next">
          <Icon name="angleLeft" />
        </a>
      ) : (
        <span className="is-disabled pt-page-next" aria-hidden="true">
          <Icon name="angleLeft" />
        </span>
      )}
    </nav>
  );
}

/* ------------------------------------------------------ sidebar widgets -- */

function SidebarBlock({
  label,
  articles,
  id,
}: {
  label: string;
  articles: Article[];
  id: string;
}) {
  return (
    <div className="pt-widget" id={id}>
      <div className="pt-block-head pt-block-head-d is-left">
        <h4 className="heading">{label}</h4>
      </div>
      <div className="pt-widget-loop">
        {articles.map((a) => (
          <SmallPostCard key={a.url} article={a} />
        ))}
      </div>
    </div>
  );
}

/**
 * Inner-page sidebar rail: LATEST NEWS + MOST READ + the real newsletter
 * widget (Subscribe header buttons anchor to it on every inner page too).
 */
export function SidebarWidgets({
  latest,
  mostRead,
  newsletter,
}: {
  latest: Article[];
  mostRead: Article[];
  newsletter: NewsletterData;
}) {
  return (
    <div className="pt-inner-sidebar">
      <SidebarBlock id="pt-sidebar-latest" label="Latest News" articles={latest} />
      <SidebarBlock id="pt-sidebar-mostread" label="Most Read" articles={mostRead} />
      <div className="pt-widget" id="pt-newsletter">
        <NewsletterWidget data={newsletter} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ archive view */

/** Async server component — the shared archive sidebar rail. */
export async function ArchiveSidebar() {
  const { latest, mostRead } = await getSidebarArticles(5);
  return <SidebarWidgets latest={latest} mostRead={mostRead} newsletter={newsletterBlock} />;
}

/**
 * The complete archive body — page title bar, hero (page 1 only), hairline
 * row list, numbered pagination and the shared sidebar rail. Every archive
 * route (/category/[slug], /tag/[slug], /all-post) and the search results
 * render through this one component so the design is identical everywhere.
 */
export function ArchiveView({
  label,
  count,
  searchTerm,
  page,
  totalPages,
  makeHref,
  items,
  sidebar,
  emptyMessage,
}: {
  label: string;
  count?: string;
  searchTerm?: string;
  page: number;
  totalPages: number;
  makeHref: (p: number) => string;
  items: ArchiveItem[];
  sidebar: React.ReactNode;
  emptyMessage: string;
}) {
  // page-1 hero = the newest item; the rest render as rows
  const [hero, ...rows] = items;
  return (
    <div className="pt-section">
      <div className="pt-container">
        <div className="pt-columns">
          <div className="pt-content-col">
            <section className="pt-archive">
              <ArchiveHead label={label} count={count} searchTerm={searchTerm} />
              {items.length === 0 ? (
                <ArchiveEmpty message={emptyMessage} />
              ) : (
                <>
                  {page === 1 && hero ? <ArchiveHero item={hero} /> : null}
                  <div className="pt-archive-list">
                    {(page === 1 ? rows : items).map((item) => (
                      <ArchiveRow key={item.slug} item={item} />
                    ))}
                  </div>
                  <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
                </>
              )}
            </section>
          </div>
          <aside className="pt-sidebar-col">{sidebar}</aside>
        </div>
      </div>
    </div>
  );
}
