"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tsi } from "./Primitives";

/**
 * Article share row — social share targets + copy-link, matching the
 * petrotimes design language (bordered square buttons, ink hover).
 *
 * Icons come from the ts-icons glyph font (SmartMag v3.2 codepoints) —
 * the same font every other front icon uses, so no extra requests.
 *
 * `url` is the absolute article URL (canonical when set) so share targets
 * are correct regardless of the browsing origin; `title` rides along as
 * the share text where the network supports it.
 */

const mailto = (url: string, title: string) =>
  `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;

export default function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const encUrl = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);

  const targets = [
    {
      id: "telegram",
      label: "اشتراک‌گذاری در تلگرام",
      icon: "e903",
      href: `https://t.me/share/url?url=${encUrl}&text=${encTitle}`,
    },
    {
      id: "whatsapp",
      label: "اشتراک‌گذاری در واتساپ",
      icon: "f232",
      href: `https://api.whatsapp.com/send?text=${encTitle}%20${encUrl}`,
    },
    {
      id: "x",
      label: "اشتراک‌گذاری در ایکس (توییتر)",
      icon: "e90a",
      href: `https://twitter.com/intent/tweet?url=${encUrl}&text=${encTitle}`,
    },
    {
      id: "facebook",
      label: "اشتراک‌گذاری در فیسبوک",
      icon: "f09a",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`,
    },
    {
      id: "linkedin",
      label: "اشتراک‌گذاری در لینکدین",
      icon: "f0e1",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`,
    },
    {
      id: "email",
      label: "اشتراک‌گذاری با ایمیل",
      icon: "f003",
      href: mailto(url, title),
    },
  ];

  const onCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // legacy fallback (http / older browsers)
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard denied — silently ignore */
    }
  }, [url]);

  return (
    <div className="pt-share-row" role="group" aria-label="اشتراک‌گذاری خبر">
      <span className="pt-share-label">اشتراک‌گذاری:</span>
      <div className="pt-share-links">
        {targets.map((t) => (
          <a
            key={t.id}
            className="pt-share-btn"
            href={t.href}
            target="_blank"
            rel="noopener nofollow"
            aria-label={t.label}
            title={t.label}
          >
            <Tsi code={t.icon} />
          </a>
        ))}
        <button
          type="button"
          className={`pt-share-btn${copied ? " is-copied" : ""}`}
          onClick={onCopy}
          aria-label="کپی لینک خبر"
          title={copied ? "لینک کپی شد" : "کپی لینک خبر"}
        >
          <Tsi code="f064" />
        </button>
        <span className={`pt-share-toast${copied ? " is-visible" : ""}`} role="status">
          لینک کپی شد
        </span>
      </div>
    </div>
  );
}
