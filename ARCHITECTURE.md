# Architecture

## Stack (versions verified at build time, Oct 2026)

| Layer | Choice |
|---|---|
| Framework | Next.js **16.4.2** (App Router, Turbopack), React 19.3 |
| Language | TypeScript 5.9, `strict: true` |
| Styling | Tailwind CSS 4 (CSS-first `@theme` tokens in `src/app/globals.css`) |
| i18n | next-intl 4.14 (`/ka`, `/en`, `localePrefix: 'always'`, no Accept-Language redirect) |
| DB | PostgreSQL 16 + Prisma **7.10** (`prisma-client` generator, `@prisma/adapter-pg` driver adapter, `prisma.config.ts`) |
| Validation | Zod 4 |
| Auth | Custom: opaque session tokens (DB-backed), Argon2id (`@node-rs/argon2`), RFC 6238 TOTP for admin |
| Email | Adapter: `console` (dev) and `resend` (HTTP API), with a DB outbox and retries |
| Storage | Adapter: `local` (dev) and `s3` (Cloudflare R2 or any S3-compatible service), `sharp` re-encoding |
| AI | `@anthropic-ai/sdk`, forced tool-use for structured output |
| Tests | Vitest 4 (unit and integration on a real Postgres), Playwright 1.64 with axe-core |

**Rendering model:** `cacheComponents` is intentionally **off**, and every page is rendered per request (`force-dynamic`). With ~500 SKUs the DB load is trivial. This rules out a shared prerendered shell or data cache ever containing partner-only prices. Next.js sends `Cache-Control: private, no-cache, no-store` for dynamic routes, and `/admin`, `/*/account` and `/api` add `no-store` and `noindex` headers explicitly (`next.config.ts`).

## Directory layout

```
prisma/schema.prisma, migrations/, seed.ts
src/
  app/
    [locale]/            public site (root layout #1: <html lang=ka|en>)
      page.tsx           home (page builder "home")
      products/, products/[slug]/, categories/[slug]/
      about/, privacy/, cookies/, [slug]/   (page-builder pages)
      where-to-buy/, contact/, partners/apply/
      account/ (login, forgot, setup, reset, profile) — noindex
    admin/               CMS (root layout #2) — (auth)/ login/MFA, (panel)/ guarded by requireAdmin, preview/
      api/export, api/template   admin-only route handlers (file downloads)
    api/health, api/cron/emails
    sitemap.ts, robots.ts, icon.png
  components/  site/ (header, footer, cards, consent…), sections/ (page-builder renderers), forms/, admin/, ui/
  i18n/        routing, request config, navigation
  lib/         pure/shared: validation, slug, sanitize, urls, totp, format, seo, page-builder registry, import core
  messages/    ka.json, en.json (UI strings)
  proxy.ts     next-intl locale middleware ("proxy" in Next 16), public paths only
  server/      server-only modules
    auth/        session.ts (cookies, DB sessions), guards.ts (getActivePartner, requireAdmin)
    services/    catalog (public DTOs), pricing, partners, tokens, content, media, translation
    import/      parse (xlsx/csv), service (preview/commit), export
    email/       provider adapters, templates, outbox
    storage/     local/S3 adapters
    actions/     server actions (public.ts, admin/*.ts)
    audit.ts, rate-limit.ts, antispam.ts, request.ts
```

## Service boundaries

- **catalog.ts** is the only source of public product data. Every query uses an explicit `select` that never includes `WholesalePrice`. English text is used only when its status is `APPROVED`; otherwise the Georgian text is returned with `fallback: true`, and the page sets `noindex` and drops English from `hreflang`.
- **pricing.ts** is the **only** reader of `WholesalePrice` for display. It calls `getActivePartner()`, which reloads the session row, the user and the partner from the DB on every request. Access requires `role = PARTNER`, `user.status = ACTIVE` and `partner.status = ACTIVE`. A stale cookie or a suspended, pending or rejected partner gets `null`. The result goes only into server-rendered JSX (`PriceTag`). It never goes into metadata, JSON-LD, the sitemap or client props beyond the formatted amount on that request.
- **partners.ts** covers application, approval, rejection, suspension, password setup and reset, and login verification with lockout.
- **content.ts** covers pages, sections, settings, banners and stores (read side), plus publishing.
- **import/** splits into pure logic in `lib/import/core.ts` (unit-tested) and DB orchestration in `server/import/service.ts`.
- **translation.ts** is the Anthropic adapter, configured by the `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` environment variables (no model ID is hard-coded).
- **email/** and **storage/** are swappable adapters selected by environment variables.

## Data model (main tables)

`User` (role SUPER_ADMIN|PARTNER, status, Argon2id hash, encrypted TOTP secret, hashed recovery codes, lockout) · `Session` (sha256 token hash, mfaPassed, expiry) · `AuthToken` (hashed one-time setup/reset tokens, expiry, usedAt) · `RateLimitHit` · `B2BPartner` (unique companyCode) · `PartnershipApplication` (PENDING/APPROVED/REJECTED, consent timestamp/version) · `Category` + `CategoryTranslation` · `Product` (unique SKU and slug, DRAFT/PUBLISHED, isHidden for full-import absence) + `ProductTranslation` (status NONE/DRAFT_REVIEW/APPROVED/REJECTED) + `ProductAttribute` + `ProductImage` · `WholesalePrice` (1:1, `Decimal(12,2)`, GEL incl. VAT) · `MediaAsset` · `Page` + `PageTranslation` + `PageSection` (revision DRAFT/PUBLISHED, typed JSON data, enStatus) · `Banner` · `SiteSetting` · `PartnerStore` · `ContactMessage` · `EmailLog` (outbox) · `ImportJob` + `ImportJobRow` (actions/diffs) · `TranslationJob` (tokens, errors) · `AuditLog`.

All keys are CUIDs. Locale uniqueness is enforced as `@@unique([entityId, locale])`, and referential integrity uses cascades.

## Page builder

`src/lib/page-builder/registry.ts` defines a typed registry of 9 sections: Hero, RichText, CategoryGrid, FeaturedProducts, ImageTextSplit, BrandStory, CTA, LogoStrip and FAQ. Each one has:

- a Zod schema (validated on every save and every render)
- a field descriptor list (the admin form is generated from it)
- localised fields `{ ka, en }`

Editing works on `DRAFT` rows. "Publish" copies the drafts into `PUBLISHED` rows in one transaction. Preview (`/admin/preview/[id]`) renders drafts through the same public components and is admin-only. Rich text is sanitised against an allow-list on save and again on render. There is no arbitrary HTML/JS, and links are restricted to relative paths, https, mailto and tel.

## Import pipeline

1. Upload (≤4 MB, ≤5,000 rows): the content signature is checked, and rows are parsed and stored on the `ImportJob`. Mapping is auto-suggested.
2. **Dry run**: `buildPlan` produces CREATE/UPDATE/UNCHANGED/INVALID per row with field diffs, plus HIDE rows (full mode only). It is stored in `ImportJobRow`. The catalogue is not changed.
3. **Commit**: the job is claimed atomically (`PREVIEWED → COMMITTED`), so double submits and replays are idempotent. The plan is recomputed, and the commit is aborted if it differs from the preview (stale guard). Any invalid row blocks the commit. Full mode requires the typed hide count. Everything is written in one DB transaction; images are fetched afterwards behind an SSRF guard. Raw rows are purged after commit.

## SEO

Locale-prefixed URLs use stable ASCII slugs (Georgian is transliterated with the national system). Each page gets a canonical URL plus `hreflang` (ka, en, x-default→ka), with English included only when approved. OpenGraph and Twitter metadata come from `buildMetadata`. JSON-LD covers Organization, Product (factual fields only, **no offers or price**) and BreadcrumbList. `sitemap.xml` lists only published, non-hidden, active-category content. `robots.txt` disallows admin, api and account paths, and disallows everything on Vercel preview deployments. Search and paginated listings are `noindex`.

## Analytics

`ConsentAndAnalytics` loads GA4 and Meta Pixel **only** when a real ID is configured **and** the visitor chose "Accept all". The choice is stored in a first-party cookie for 180 days and can be changed from the footer ("Cookie settings").
