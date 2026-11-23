'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { MenuItem, Article, NewsletterData } from '@/lib/content';
import { Icon } from './Primitives';
import { SmallPostCard } from './PostCards';
import { NewsletterWidget } from './NewsletterWidget';

/**
 * Site chrome: desktop header (sticky-smart), mobile header (≤1024),
 * off-canvas menu (menu + What's Hot + newsletter) and fullscreen search
 * modal — all interactivity of the original SmartMag chrome reproduced.
 */
export function Chrome({
  menu,
  whatsHot,
  newsletter,
}: {
  menu: MenuItem[];
  whatsHot: Article[];
  newsletter: NewsletterData;
}) {
  const [offcanvasOpen, setOffcanvasOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sticky, setSticky] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);

  /* dynamic current-menu-item state: exact pathname match (home stays
     highlighted on / exactly like the live current-menu-item; category and
     all-post pages highlight their own item; single posts highlight none). */
  const pathname = usePathname();
  const menuWithCurrent = menu.map((item) => ({
    ...item,
    current: item.href === pathname,
  }));

  /* smart sticky: header fixes after scrolling past its own height.
     Desktop header (≥941) is the two-bar master-prompt structure
     (101px black top bar + 50px dark nav row = 151px), so its threshold
     is 151; the mobile header keeps its 63px behavior. Re-evaluated on
     resize so crossing the breakpoint never leaves a stale state. */
  useEffect(() => {
    const onScroll = () => {
      const desktop = window.matchMedia('(min-width: 941px)').matches;
      setSticky(window.scrollY > (desktop ? 151 : 63));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setOffcanvasOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* lock page scroll while overlays are open (live behavior) */
  useEffect(() => {
    document.documentElement.classList.toggle('pt-modal-open', offcanvasOpen || searchOpen);
    return () => document.documentElement.classList.remove('pt-modal-open');
  }, [offcanvasOpen, searchOpen]);

  return (
    <>
      {/* Desktop header (≥941) — master-prompt two-bar structure:
          A) 101px black top bar (hamburger + logo | Subscribe + search)
          B) 50px dark navigation row below it. Total before the price
          ticker = 151px. Mobile (≤940) renders its own separate header
          and is untouched. */}
      <div className="pt-head-slot pt-head-slot-desktop">
        <header className={`pt-smart-head ${sticky ? 'is-sticky' : ''}`} id="smart-head" data-sticky="auto">
        <div className="pt-head-row pt-dark">
          <div className="pt-wrap">
            <div className="pt-head-items-left">
              <button
                type="button"
                className="pt-offcanvas-toggle"
                aria-label="Menu"
                onClick={() => setOffcanvasOpen(true)}
              >
                <span className="pt-hamburger"><span className="inner" /></span>
              </button>
              <a href="/" title="Petro Times" rel="home" className="pt-logo-link">
                <span>
                  { }
                  <img
                    src="/assets/logos/logo-main-PAsset-3-1.png"
                    className="pt-logo-img"
                    alt="Petro Times"
                    width={529}
                    height={88}
                  />
                </span>
              </a>
            </div>
            <div className="pt-head-items-right">
              {/* Subscribe — the site's real newsletter capability (sidebar
                  widget anchor); no fake checkout flow */}
              <a href="#pt-newsletter" className="pt-head-subscribe">
                Subscribe
              </a>
              <a
                href="#"
                className="pt-search-icon"
                title="Search"
                onClick={(e) => {
                  e.preventDefault();
                  setSearchOpen(true);
                }}
              >
                <Icon name="search" />
              </a>
            </div>
          </div>
        </div>
        {/* B) dark navigation row — 50px bar below the black top header */}
        <div className="pt-head-navrow pt-dark">
          <div className="pt-wrap">
            <nav className="pt-nav-wrap" aria-label="Main">
              <ul className="pt-navigation menu">
                {menuWithCurrent.map((item) => (
                  <li key={item.label} className={item.current ? 'current-menu-item' : ''}>
                    <a href={item.href} aria-current={item.current ? 'page' : undefined}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
        </header>
      </div>

      {/* mobile header (≤940) — same flow-slot pattern (48px reserved,
          42px at ≤767 per the client reference). The row is physically LTR:
          reference order is menu + logo on the left, Subscribe + search on
          the right, regardless of the RTL content direction. */}
      <div className="pt-head-slot pt-head-slot-mobile">
        <div className={`pt-mobile-head ${sticky ? 'is-sticky' : ''}`} id="smart-head-mobile">
        <div className="pt-mobile-head-row pt-dark">
          <div className="pt-wrap">
            <button
              type="button"
              className="pt-mobile-toggle"
              aria-label="Menu"
              onClick={() => setOffcanvasOpen(true)}
            >
              <span className="pt-hamburger"><span className="inner" /></span>
            </button>
            <a href="/" className="pt-mobile-logo" aria-label="Petro Times">
              { }
              <img src="/assets/logos/logo-main-PAsset-3-1.png" alt="Petro Times" width={265} height={44} />
            </a>
            <div className="pt-mobile-actions">
              <a href="#pt-newsletter" className="pt-head-subscribe">
                Subscribe
              </a>
              <a
                href="#"
                className="pt-mobile-search"
                aria-label="Search"
                onClick={(e) => {
                  e.preventDefault();
                  setSearchOpen(true);
                }}
              >
                <Icon name="search" />
              </a>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* off-canvas menu — live structure: .off-canvas > head (close + ts-logo) +
          content (mobile-menu + off-canvas-widgets). The live theme clones the
          main navigation into .mobile-menu ONLY on mobile viewports (≤1024):
          the desktop capture geometry-1920 shows the ul empty (widgets at
          y=162.1), the 390px interaction capture shows it populated. The
          desktop emptiness is reproduced via CSS (menu li display:none ≥1025). */}
      <div
        className={`pt-offcanvas-backdrop ${offcanvasOpen ? 'is-open' : ''}`}
        onClick={() => setOffcanvasOpen(false)}
        aria-hidden="true"
      />
      <aside className={`pt-offcanvas pt-dark ${offcanvasOpen ? 'is-open' : ''}`} id="off-canvas" aria-hidden={!offcanvasOpen}>
        <div className="pt-offcanvas-head">
          <button type="button" className="pt-offcanvas-close" aria-label="Close Menu" onClick={() => setOffcanvasOpen(false)}>
            <Icon name="times" />
          </button>
          <a href="/" className="pt-offcanvas-logo" title="Petro Times" rel="home">
            <img src="/assets/logos/logo-main-PAsset-3-1.png" alt="Petro Times" width={265} height={44} />
          </a>
        </div>
        <div className="pt-offcanvas-content">
          <ul className="mobile-menu">
            {menuWithCurrent.map((item) => (
              <li key={item.label}>
                <a href={item.href} onClick={() => setOffcanvasOpen(false)}>{item.label}</a>
              </li>
            ))}
          </ul>
          <OffCanvasWidgets whatsHot={whatsHot} newsletter={newsletter} />
          <OffCanvasSocial />
        </div>
      </aside>

      {/* search modal */}
      <div className={`pt-search-modal ${searchOpen ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-hidden={!searchOpen}>
        <button type="button" className="pt-search-close" aria-label="Close Search" onClick={() => setSearchOpen(false)}>
          <Icon name="times" />
        </button>
        <div className="pt-search-modal-box">
          <form
            method="get"
            className="search-form"
            action="/search"
            onSubmit={() => setSearchOpen(false)}
          >
            <input
              ref={searchInput}
              type="search"
              className="pt-search-field"
              name="s"
              placeholder="Search..."
              required
              autoComplete="off"
            />
            <button type="submit" className="pt-visuallyhidden">Submit</button>
            <p className="pt-search-message">
              Type above and press <em>Enter</em> to search. Press <em>Esc</em> to cancel.
            </p>
          </form>
        </div>
      </div>
    </>
  );
}

/* off-canvas bottom widgets — live structure (rendered-dom.html + live
   measurement): .off-canvas-widgets = What's Hot (smartmag-block-posts-small-2,
   block-head-b fs 20, 3 small posts) + smartmag-block-newsletter-4
   (spc-newsletter-b center sm — 6px frame is the element's own border);
   box measured 320×756.3 at y=162.1. The .spc-social-block is a SIBLING
   (direct flex child of .off-canvas-content) — see Chrome JSX below. */
function OffCanvasWidgets({ whatsHot, newsletter }: { whatsHot: Article[]; newsletter: NewsletterData }) {
  return (
    <div className="pt-offcanvas-widgets">
      <div className="pt-widget pt-whatshot">
        <div className="pt-block-head pt-block-head-b">
          <h5 className="heading">What&apos;s Hot</h5>
        </div>
        <div className="pt-loop">
          {whatsHot.map((a) => (
            <SmallPostCard key={a.url} article={a} />
          ))}
        </div>
      </div>
      <NewsletterWidget data={newsletter} variant="sm" />
    </div>
  );
}

/* live: .spc-social-block.spc-social-b.smart-head-social — direct child of
   .off-canvas-content, pushed to the bottom via margin-top:auto; 3 circle
   icons (facebook / x / instagram) — real hrefs from the live DOM */
function OffCanvasSocial() {
  return (
    <div className="pt-offcanvas-social">
      <a href="https://www.facebook.com/share/15Yx3THCSY/?mibextid=LQQJ4d" className="pt-svc-link pt-s-facebook" target="_blank" rel="nofollow noopener">
        <Icon name="facebook" />
        <span className="pt-visuallyhidden">Facebook</span>
      </a>
      <a href="https://x.com/Petrotimes_ir" className="pt-svc-link pt-s-twitter" target="_blank" rel="nofollow noopener">
        <Icon name="twitter" />
        <span className="pt-visuallyhidden">X (Twitter)</span>
      </a>
      <a href="https://Instagram.com/Petrotimes.ir" className="pt-svc-link pt-s-instagram" target="_blank" rel="nofollow noopener">
        <Icon name="instagram" />
        <span className="pt-visuallyhidden">Instagram</span>
      </a>
    </div>
  );
}
