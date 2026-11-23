import type { FooterData } from '@/lib/content';
import { Icon, Icons } from './Primitives';
import { SmallPostCard } from './PostCards';

/* live DOM order (RTL renders first child rightmost): facebook → youtube */
const ABOUT_ICONS: (keyof typeof Icons)[] = ['facebook', 'twitter', 'telegram', 'instagram', 'youtubePlay'];
const ABOUT_HREFS = [
  'https://www.facebook.com/share/15Yx3THCSY/?mibextid=LQQJ4d',
  'https://x.com/Petrotimes_ir',
  'https://t.me/petrotimes_ir',
  'https://Instagram.com/Petrotimes.ir',
  'https://youtube.com/@petrotimes_ir?si=LtuI-OvoSXzeA1FB',
];

/**
 * Footer (Elementor template 7373): black, 3 RTL columns — ABOUT US (324px,
 * right, starts 20px lower) / بیشترین بازدید روز (399px) / اخرین اخبار (397px);
 * post rows 17px white titles, 32px gaps with separator lines; copyright 41px.
 */
export function SiteFooter({ footer }: { footer: FooterData }) {
  return (
    <footer className="pt-footer" data-testid="footer">
      <div className="pt-footer-main">
        <div className="pt-section">
          <div className="pt-container">
            <div className="pt-footer-cols">
              <div className="pt-footer-col-about">
                <h2 className="pt-footer-about-heading">{footer.about.heading}</h2>
                <div className="about-logo">
                  { }
                  <img
                    src="/assets/logos/logo-main-PAsset-3-1.png"
                    alt="Petro Times"
                    width={529}
                    height={88}
                  />
                </div>
                <p className="about-text">{footer.about.text}</p>
                <p className="about-email">
                  <strong>{footer.about.emailHtml.bold}</strong> {footer.about.emailHtml.rest}
                </p>
                <div className="about-social">
                  {ABOUT_ICONS.map((name, i) => (
                    <a key={name} href={ABOUT_HREFS[i]} target="_blank" rel="nofollow noopener" aria-label={name}>
                      <Icon name={name} />
                    </a>
                  ))}
                </div>
              </div>
              <div className="pt-footer-col-popular">
                <h2 className="pt-footer-heading pt-hidden-mobile">{footer.popularHeading}</h2>
                <div className="pt-footer-posts-wrap">
                  <div className="pt-footer-posts">
                    {footer.popular.map((a) => (
                      <SmallPostCard key={a.url} article={a} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-footer-col-latest">
                <h2 className="pt-footer-heading pt-hidden-mobile">{footer.latestHeading}</h2>
                <div className="pt-footer-posts-wrap">
                  <div className="pt-footer-posts">
                    {footer.latest.map((a) => (
                      <SmallPostCard key={a.url} article={a} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pt-footer-lower">
        <div className="pt-footer-copyright">
          <div className="copyright-text">{footer.copyright}</div>
        </div>
      </div>
    </footer>
  );
}
