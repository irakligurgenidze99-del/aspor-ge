# Test report

**Date:** 2026-10-16. **Environment:** Linux cloud sandbox, Node 22.22, PostgreSQL 16 (local), Chromium (Playwright 1.64).
**Scope:** everything below was **implemented and tested locally**. **Nothing was verified in production** because no deployment exists.

## Results

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | ✅ 0 errors, 0 warnings |
| Strict typecheck | `npm run typecheck` | ✅ 0 errors |
| Unit + integration (real Postgres) | `npm test` | ✅ **63 / 63** passed (6 files) |
| Production build | `npm run build` | ✅ 55 routes, Turbopack |
| E2E (production server + test DB, desktop + mobile) | `npm run test:e2e` | ✅ **16 / 16** passed |
| Clean install | `npm ci` in an empty directory | ✅ |

An independent review by a separate agent was run against the finished code. It found 1 critical, 2 high and several medium issues:

- **Critical:** admin pages relied only on the layout guard, and RSC partial rendering could skip that layout.
- **High:** an open redirect via control characters in `next`; tokens leaking to analytics on `/account/*`.
- **Medium:** reset tokens not bound to admin vs partner; TOTP codes could be replayed; partial imports could un-hide manually hidden products; the stale-preview check only compared counts; a failed image download dropped a product's other images.

**All of these were fixed, and regression tests were added for each.** Results above are after the fixes.

## Acceptance tests → coverage

| Requirement (spec §9) | Where tested | Status |
|---|---|---|
| Anonymous visitors never see wholesale prices: DOM, HTML, RSC payload, API, JSON-LD, metadata, sitemap, robots | E2E `public.spec` "anonymous visitor…" (10 routes × HTML + `RSC: 1` payload, JSON-LD has no `offers`/`price`); integration "anonymous: no prices; public DTOs never contain price fields" | ✅ |
| Pending, rejected and suspended partners and old sessions get no prices, including via direct requests | Integration "active partner sees…; pending/suspended/old sessions do not", "PENDING_SETUP gets no prices", admin-cookie replay; E2E suspend with old cookie | ✅ |
| Active partner sees the same GEL VAT-inclusive price on cards and detail; logout removes it | E2E `partner-flow` (card + detail, `დღგ-ს ჩათვლით`, private cache headers, logout); integration (second partner sees the same price, no tiers) | ✅ |
| No role elevation, no approving yourself, no reading another company's profile, no admin endpoints for non-admins | Integration "profile update only touches the session partner" (forged `id`/`role` ignored), "admin actions require admin session with MFA"; E2E partner → `/admin` redirect and `/admin/api/export` 401; **E2E crafted `Next-Router-State-Tree` against 4 admin pages** | ✅ |
| Registration validation, duplicate handling, approval, rejection, token expiry and one-time use, reset, templates | Unit (schema, template escaping); integration (duplicates, double approval, rejection email, expiry, one-time, invalidation, realm binding, silent reset for unknown email, lockout); E2E full flow + reused link + identical forgot response | ✅ |
| Five categories, SKU search, draft vs published visibility, independent colour SKUs | E2E "draft product is 404; SKU search…"; integration "drafts and hidden… each colour SKU independent" | ✅ |
| Import: preview finds create/update/invalid; no DB change before confirmation; full import hides; partial never hides; duplicate SKUs rejected; repeat import is safe | Unit `import.test` (12 cases); integration (dry run leaves DB identical, idempotent commit, full-import hide with count confirmation, invalid rows block commit, stale guard, xlsx, export→import round trip, manual hides respected); E2E UI flows for partial commit and the full-import warning | ✅ |
| Page builder: create, reorder, hide, preview, translate, publish; untrusted scripts cannot run | Integration (add, edit, reorder, hide, publish, sanitise, unsafe URL rejected, English edit resets approval); E2E (hostile payload, `window.__pwned` stays undefined in preview and public page) | ✅ (translate step: see limitations) |
| Claude-generated English stays private until review; missing key and provider errors handled | Integration (not_configured, mocked HTTP 500 → `provider_error` + FAILED job logged, mocked valid tool-use → stored as `DRAFT_REVIEW`); E2E unreviewed English section absent from `/en`, disabled-state button | ✅ (mocked provider) |
| Contact messages stored; email attempted safely with retry and logging | Integration (stored + notification queued; provider failure → FAILED with error → outbox retry → SENT); E2E contact form | ✅ |
| Locale routes, canonical, hreflang, sitemap, robots, SEO metadata | E2E "SEO…" (canonical, hreflang ka/en/x-default, English dropped + noindex when not approved, OG tags, robots rules, sitemap includes/excludes, `/` → `/ka`) | ✅ |
| Mobile layout, keyboard, forms, image optimisation, reduced motion | E2E `responsive.spec` (Pixel 7: no horizontal overflow on 5 pages, menu with Escape, `/_next/image`, transitions ≈0 under reduced motion); keyboard skip link and focus outline; accessible form errors (`aria-invalid`, role=alert); **axe-core WCAG 2.0/2.1/2.2 A+AA: 0 violations on 7 pages** | ✅ |
| CI: lint, strict typecheck, unit/integration, build, E2E | `.github/workflows/ci.yml` (Postgres service, standard `prisma migrate deploy`) | ⚠ defined, **not run on GitHub** (no repository/remote) |

## Limitations / not verified

- **Real third-party services were not called:** Resend, Cloudflare R2, Neon, Vercel Cron, GA4, Meta Pixel and the Anthropic API. Their adapters are covered by unit/integration tests with the `console` or `local` providers and mocked HTTP. The R2 (`S3Storage`) adapter is **untested against a real bucket**.
- **The Claude translation round-trip was tested with a mocked API response**, not a live model. A real key and a current `ANTHROPIC_MODEL` are needed for a live check.
- **Prisma migrations:** the sandbox could not download Prisma's native schema engine (`binaries.prisma.sh` blocked). Migrations were generated and applied with the official WASM engine (`scripts/prisma-wasm.mjs`). The standard `prisma migrate deploy` path (CI, Vercel) was **not exercised here**.
- **E2E coverage gaps:** E2E ran on Chromium only, with no Firefox or Safari runs. Performance (Lighthouse/CWV) was not measured. Visual checks were done manually from screenshots, at 1366 px and 390 px.
- **Seed catalogue:** the 136 products come from the supplier workbook, so their names and specs are supplier English. The colour SKUs are provisional.
- `npm audit` reports advisories in transitive dependencies. They were not triaged.

## How to reproduce

```bash
docker compose up -d                       # or any Postgres with databases aspor + aspor_test
cp .env.example .env && $EDITOR .env
npm ci && npx prisma migrate deploy
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
npm run lint && npm run typecheck && npm test
npm run build && npm run test:e2e          # E2E starts `next start` on :3100 against TEST_DATABASE_URL
```
