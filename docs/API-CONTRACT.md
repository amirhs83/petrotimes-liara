# Content API Contract — Petro Times frontend ⇄ backend

نسخه: 1.0 — این قرارداد پایدار است؛ تا زمانی که نسخه افزایش نیابد، تغییر در ساختار مجاز نیست.

این سند قرارداد HTTP بین **فرانت‌اند Petro Times** (Next.js 16) و **بکند جدا** را مشخص می‌کند.
بکند می‌تواند با **هر زبان و فریم‌ورکی** (Go / Python / Node / PHP / .NET / Java …) پیاده‌سازی شود؛
تنها چیزی که برای فرانت‌اند مهم است، پایبندی به همین قرارداد HTTP/JSON است. هیچ وابستگی به
CMS یا پلتفرم خاصی وجود ندارد.

---

## 1. Configuration (frontend side)

| Variable | Meaning |
|---|---|
| `CONTENT_API_MODE` | `snapshot` (default, no backend needed) / `remote` (use the backend below) |
| `CONTENT_API_BASE_URL` | Base URL of the backend, e.g. `https://api.petrotimes.example` |
| `CONTENT_API_TOKEN` | Optional — sent as `Authorization: Bearer <token>` on every request |
| `CONTENT_API_TIMEOUT_MS` | Optional — upstream timeout (default `8000`) |
| `NEWSLETTER_API_URL` | Optional — overrides the newsletter upstream URL |

**Resilience rule:** if the backend is unreachable, returns non-2xx, or returns an invalid
payload, the frontend automatically falls back to the bundled snapshot. A broken backend never
produces a blank page.

---

## 2. Endpoint: `GET {CONTENT_API_BASE_URL}/homepage`

Returns the fully assembled homepage content. The backend decides *which* post appears in
*which* widget — the frontend renders slots exactly as given.

### Request

```
GET /homepage
Accept: application/json
Authorization: Bearer <token>        (only if CONTENT_API_TOKEN is set)
```

### Response — `200 OK`

`Content-Type: application/json; charset=utf-8`

Body = the `HomepageData` object defined below. `Cache-Control` MAY be set by the backend
(the frontend currently requests with `cache: 'no-store'`).

### Response — error cases

Any non-2xx status is treated as failure (frontend falls back to snapshot). Recommended:

| Status | When |
|---|---|
| `401/403` | token missing/invalid |
| `500` | backend internal error |
| `503` | upstream data store unavailable |

### `HomepageData` JSON schema

```jsonc
{
  "header": {
    "menu": [                       // main nav, in display order (RTL: first = right-most)
      { "label": "صفحه اصلی", "href": "/", "current": true },
      { "label": "نفت", "href": "https://…/naft/", "current": false }
    ]
  },
  "ticker": {
    "iframeUrl": "https://market.petrotimes.ir/…",   // market widget host — origin is the real price source (see §6)
    "items": [                      // commodity list (names/icons of the ticker cards)
      { "key": "methanol", "name": "Methanol", "icon": "/assets/icons/ticker/methanol.svg" }
    ]
  },
  "sections": {
    "heroMain":      { "…Article": 0 },      // TOP NEWS — big hero card
    "heroSecondary": [ ],                   // exactly 4 Articles
    "tvPlayer":      { },                   // TV section player poster (Article)
    "tvPlaylist":    [ ],                   // exactly 5 Articles
    "topNewsLabel":  { "label": "top news", "article": { } },
    "topNewsItems":  [ ],                   // 3 Articles
    "magazine":      { "label": "magazine", "articles": [ ] },  // 5 Articles
    "featureTitle":  { "label": "feature title", "items": [ ] }, // FeatureArticles
    "energyMain":    { },                   // ENERGY — hero card (Article)
    "energySubs":    [ ],                   // exactly 2 Articles
    "energyGrid":    [ ],                   // exactly 3 Articles
    "social":        { "label": "we are social", "links": [ ] },
    "newsletter":    { },                   // NewsletterData
    "advertise":     { "label": "advertise", "items": [ ] },    // 2 Articles
    "footer":        { },                   // FooterData
    "offcanvas":     { "whatsHot": [ ] }    // 4 Articles
  }
}
```

### Nested object schemas

```jsonc
// Article — every news card on the page
{
  "title": "string",                  // plain text, no HTML
  "url": "https://…",                 // absolute article URL
  "dateText": "۲۹ مرداد ۱۴۰۵ - ۱۵:۲۳", // PRE-FORMATTED Persian (Jalali) date + time
  "category": "نفت",
  "categoryUrl": "https://…",
  "excerpt": "string",
  "image": "https://…",               // thumbnail (small variant) — or null
  "imageFull": "https://…",           // large variant (hero / TV overlay) — or null
  "eyebrow": "…"                      // OPTIONAL overline/kicker for the FEATURED NEWS block
}                                     //   (additive, v1-compatible; absent/null → not rendered)

// FeatureArticle — FEATURE TITLE ranked list
{
  "title": "string",
  "url": "https://…",
  "dateText": "…",
  "category": "…",
  "categoryUrl": "…",
  "rankIcon": "/assets/icons/number-1.png"   // rank badge icon path
}

// SocialLink — WE ARE SOCIAL widget
{ "network": "facebook", "label": "Facebook", "href": "https://…" }

// NewsletterData — newsletter block (sidebar + off-canvas)
{
  "heading": "خبرنامه",
  "text": "…",
  "placeholder": "ایمیل شما…",
  "button": "عضویت",
  "disclaimer": "…",
  "disclaimerLink": "https://…"
}

// FooterData
{
  "about": {
    "heading": "درباره ما",
    "text": "…",
    "emailHtml": { "bold": "Email Us:", "rest": " info@petrotimes.ir" }
  },
  "popularHeading": "بیشترین بازدید روز",
  "latestHeading": "اخرین اخبار",
  "popular": [ ],   // 4 Articles
  "latest": [ ],    // 4 Articles
  "copyright": "حق نشر © 2026 Petro Times"
}
```

Nullable fields: `category`, `categoryUrl`, `excerpt`, `image`, `imageFull`, `eyebrow` may be `null`.

### Field rules (enforced by the frontend's fail-fast guard)

1. `dateText` MUST arrive **already formatted** in Persian Jalali form
   `«۲۹ مرداد ۱۴۰۵ - ۱۵:۲۳»` (day month year − HH:MM, Persian digits). The backend owns the
   calendar conversion; the frontend renders the string verbatim.
2. `title`, `excerpt` MUST be plain text (no HTML tags/entities).
3. `image`/`imageFull` SHOULD be absolute URLs; app-relative paths (`/assets/…`) are allowed
   for bundled icons only.
4. Array lengths shown above are the **design lengths** (the visual layout is calibrated to
   them). The frontend renders whatever count arrives, but geometry parity is only guaranteed
   for these lengths.
5. Unknown extra fields are ignored; missing REQUIRED fields fail the guard and trigger
   snapshot fallback.

---

## 3. Endpoint: `POST {CONTENT_API_BASE_URL}/newsletter`

Receives newsletter subscriptions submitted from the sidebar / off-canvas newsletter form.

### Request

```
POST /newsletter
Content-Type: application/json
Authorization: Bearer <token>        (only if CONTENT_API_TOKEN is set)

{ "email": "user@example.com" }
```

### Response

| Status | Meaning |
|---|---|
| `200`/`201` | subscribed (frontend shows success message) |
| `400` | invalid email (frontend shows error message) |
| `4xx/5xx` | any other failure (frontend shows generic error) |

The frontend's own proxy (`POST /api/newsletter`) validates the email shape, forwards the body
unchanged, and maps upstream 2xx → 200, everything else → 502.

---

## 4. Market quotes — internal bridge `GET /api/market` (frontend-provided)

The commodity cards of the market ticker read live prices through a frontend
server route. It is **not** part of the content backend contract — it is
implemented by the frontend itself (`src/app/api/market/route.ts`) and calls
the project's real market source:

```
GET {origin-of-ticker.iframeUrl}/fetch_prices.php
→ { "<key>": { "first": "3594.00", "sec": "49.00", "third": "1.39%" }, … }
```

`first` = price, `sec` = change amount, `third` = percent change. The bridge
maps this payload onto `ticker.items` (key/name/icon from the content layer)
and serves:

```jsonc
// GET /api/market → 200
{
  "ok": true,
  "updatedAt": "2026-11-19T11:16:15.000Z",
  "items": [
    { "key": "methanol", "price": "3594.00", "change": "49.00", "percent": "1.39%" }
    // price/change/percent are null when the upstream publishes no value —
    // the UI then renders the N/A unavailable state. Values are never fabricated.
  ]
}
```

Caching: 30s in-memory TTL upstream-side; the browser re-polls every 30s.
When the future backend takes over market data, it can serve the same shape
directly from this endpoint's origin or replace the bridge transparently.

## 5. Versioning & evolution

- This contract is **v1**. Any breaking change must bump the version and be coordinated with
  the frontend (`src/lib/content/remote.ts` is the only integration point).
- New homepage widgets = new keys inside `sections` + a minor-version bump; the frontend
  adopts them with a matching release.

## 6. Implementation checklist for the backend (any language)

- [ ] `GET /homepage` returns the exact `HomepageData` JSON (Content-Type: application/json)
- [ ] Jalali date formatting for `dateText` (e.g. `۲۹ مرداد ۱۴۰۵ - ۱۵:۲۳`)
- [ ] `POST /newsletter` accepts `{"email"}` and answers 2xx/4xx as documented
- [ ] Optional `Authorization: Bearer` verification when a token is configured
- [ ] `Content-Type: application/json; charset=utf-8` on all responses (Persian text!)
- [ ] Sensible `Cache-Control` (content changes a few times per hour at most)
