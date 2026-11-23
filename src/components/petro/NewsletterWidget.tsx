'use client';

import { useState } from 'react';
import type { NewsletterData } from '@/lib/content';
import { Icon } from './Primitives';

/**
 * Newsletter widget — real form behavior: client-side email validation,
 * submission goes to /api/newsletter which proxies to the external content
 * backend when an upstream is configured (NEWSLETTER_API_URL or
 * CONTENT_API_BASE_URL — any backend language, see docs/API-CONTRACT.md).
 * Without a backend the API answers 501 and the message is shown honestly.
 *
 * variant="sm" renders the SmartMag native off-canvas widget
 * (smartmag-block-newsletter-4: spc-newsletter-b center sm) — same texts,
 * no envelope watermark, 6px frame on the element itself (see petro.css).
 */
export function NewsletterWidget({
  data,
  variant = 'default',
}: {
  data: NewsletterData;
  variant?: 'default' | 'sm';
}) {
  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !agree) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus('ok');
        setMessage('عضویت شما ثبت شد. متشکریم!');
      } else {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setStatus('error');
        setMessage(body?.message ?? 'ثبت عضویت در این محیط فعال نیست.');
      }
    } catch {
      setStatus('error');
      setMessage('ارسال درخواست عضویت ناموفق بود.');
    }
  }

  const isSm = variant === 'sm';
  return (
    <div
      className={`pt-newsletter ${isSm ? 'pt-newsletter-sm' : ''}`}
      data-testid={isSm ? 'newsletter-offcanvas' : 'newsletter'}
    >
      <div className="inner">
        {isSm ? null : (
          <div className="mail-bg-icon">
            <Icon name="envelopeO" />
          </div>
        )}
        <h3 className="heading">{data.heading}</h3>
        <div className="base-text message">
          <p>{data.text}</p>
        </div>
        <form method="post" className="form fields-style fields-full" onSubmit={handleSubmit} noValidate={false}>
          <div className="main-fields">
            <p className="field-email">
              <input
                type="email"
                name="EMAIL"
                placeholder={data.placeholder}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label={data.placeholder}
              />
            </p>
            <p className="field-submit">
              <input type="submit" value={data.button} disabled={status === 'sending'} />
            </p>
          </div>
          <p className="disclaimer">
            <label>
              <input
                type="checkbox"
                name="privacy"
                required
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              {data.disclaimer} <a href={data.disclaimerLink}>terms</a> agreement.
            </label>
          </p>
        </form>
        {status === 'ok' || status === 'error' ? (
          <p className={`pt-newsletter-status ${status === 'ok' ? 'is-ok' : 'is-error'}`} role="status">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
