import type { SocialLink } from '@/lib/content';
import { Icon, Icons } from './Primitives';

const ICON_FOR: Record<SocialLink['network'], keyof typeof Icons> = {
  facebook: 'facebook',
  twitter: 'twitter',
  youtube: 'youtubePlay',
  telegram: 'telegram',
  instagram: 'instagram',
  linkedin: 'linkedin',
};

/**
 * WE ARE SOCIAL — 2-col grid of colored buttons 173×36 (icon box 38px on the
 * right side in RTL, label, radius 2). Exact brand colors from theme tokens.
 */
export function SocialWidget({ label, links }: { label: string; links: SocialLink[] }) {
  return (
    <div className="pt-social-widget" data-testid="social-widget">
      <div className="pt-block-head pt-block-head-e pt-block-head-e2 is-left">
        <h5 className="heading">{label}</h5>
      </div>
      <ul className="pt-social-services">
        {links.map((l) => (
          <li key={l.network}>
            <a
              href={l.href || '#'}
              className={`pt-social-service pt-svc-${l.network}`}
              target="_blank"
              rel="nofollow noopener"
            >
              <span className="the-icon">
                <Icon name={ICON_FOR[l.network]} label={l.label} />
              </span>
              <span className="label">{l.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
