import type { ReactNode } from 'react';
import { topNewsDateLine } from '@/lib/content/english-meta';

/** ts-icons glyph (SmartMag icon font, v3.2 codepoints) */
export function Tsi({ code, className = '', label }: { code: string; className?: string; label?: string }) {
  return (
    <i
      className={`pt-icon ${className}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    >
      {String.fromCodePoint(parseInt(code, 16))}
    </i>
  );
}

export const Icons = {
  search: 'f002',
  times: 'f00d',
  play: 'f04b',
  angleLeft: 'f104',
  angleRight: 'f105',
  envelopeO: 'f003',
  facebook: 'f09a',
  twitter: 'e90a',
  youtubePlay: 'f16a',
  telegram: 'e903',
  instagram: 'f16d',
  linkedin: 'f0e1',
  pictureO: 'f03e',
} as const;

export type IconName = keyof typeof Icons;

export function Icon({ name, className = '', label }: { name: IconName; className?: string; label?: string }) {
  return <Tsi code={Icons[name]} className={className} label={label} />;
}

/**
 * English date/time line for TV-section cards ("AUG 19, 2026 • 06:53 PM")
 * — the Top News meta recipe (topNewsDateLine). The markup renders on every
 * breakpoint, but CSS keeps .pt-en-date display:none outside phones ≤767
 * inside the TV sections — desktop/tablet keep the Persian post-date.
 */
export function EnglishDateLine({ dateText, className = '' }: { dateText: string; className?: string }) {
  const line = topNewsDateLine(dateText);
  if (!line) return null;
  return (
    <p className={`pt-en-date${className ? ` ${className}` : ''}`} dir="ltr">
      {line}
    </p>
  );
}

/** category chip (نفت / بین الملل / magazine …) */
export function CategoryChip({ label, href }: { label: string; href: string | null }) {
  const cls = 'pt-cat-chip';
  if (!href) return <span className={cls}>{label}</span>;
  return (
    <a href={href} className={cls} rel="category">
      {label}
    </a>
  );
}

/** meta row: category — date (the — separator is drawn by CSS ::before) */
export function PostMeta({
  category,
  categoryUrl,
  dateText,
  variant = 'light',
  above = false,
  englishDate = false,
}: {
  category: string | null;
  categoryUrl: string | null;
  dateText: string;
  variant?: 'light' | 'dark';
  above?: boolean;
  /** swap the Persian date for the Top News English line
   *  ("NOV 23, 2026 • 02:59 PM") inside the same date slot */
  englishDate?: boolean;
}) {
  const enLine = englishDate ? topNewsDateLine(dateText) : null;
  /* Top News date placement (client request: "همه باید بیان سمت چپ خبر —
     دقیقا مثل تاپ نیوز"): the English date line is pinned to the visual
     LEFT edge of the meta row. The row flex classes differ by content:
      - has-en-date: category (start/right) + date (end/left), spaced apart
      - en-date-only: the date alone at the left edge (RTL flex-end) */
  const enRowClass = !enLine
    ? ''
    : category && !above
      ? ' has-en-date'
      : ' en-date-only';
  return (
    <div className={`pt-post-meta ${variant === 'dark' ? 'pt-meta-dark' : ''}`}>
      {above && category ? (
        <div className="meta-above">
          <span className="meta-item cat-labels">
            <CategoryChip label={category} href={categoryUrl} />
          </span>
        </div>
      ) : null}
      <div className={`meta-below meta-below-row${enRowClass}`}>
        {category && !above ? (
          <span className="meta-item post-cat">
            <a href={categoryUrl ?? '#'} className="post-cat-link" rel="category">
              {category}
            </a>
          </span>
        ) : null}
        {/* live HTML carries a whitespace text node between the meta items —
            it renders as a ~2.4px Barlow-11px space and offsets the date */}
        {' '}
        <span className="meta-item date">
          <span className="date-link">
            <time
              className={`post-date${enLine ? ' pt-meta-date-en' : ''}`}
              dir={enLine ? 'ltr' : undefined}
            >
              {enLine ?? dateText}
            </time>
          </span>
        </span>
      </div>
    </div>
  );
}

export function MetaSlot({ children }: { children: ReactNode }) {
  return <div className="meta-below meta-below-row">{children}</div>;
}
