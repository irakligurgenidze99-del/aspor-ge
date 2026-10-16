# ASPOR.GE

ASPOR-ის ოფიციალური კატალოგი და B2B ფასების პორტალი. აპლიკაცია ორენოვანია: ქართული ძირითადი ენაა, ინგლისური მეორე. ეს არ არის ონლაინ მაღაზია, ამიტომ კალათა, შეკვეთა და მარაგი არ აქვს.

Official ASPOR product catalogue and private B2B price portal for Georgian retailers and distributors. Built with Next.js 16 (App Router), TypeScript (strict), Tailwind CSS 4, PostgreSQL + Prisma 7, next-intl, Zod, Vitest and Playwright.

> **Status:** implemented and tested **locally** (see `TEST_REPORT.md`). **Not deployed.** Production needs the accounts and secrets listed in `DEPLOYMENT.md` → "Inputs still required".

## What it does

| Area | Summary |
|---|---|
| Public site (`/ka`, `/en`) | Home page with a page-builder layout, catalogue with SKU and name search, five categories, product pages with gallery and specs, where-to-buy directory, about page, contact form, partner application form, privacy and cookie pages. Every colour is a separate product with its own SKU and URL. |
| B2B | Partners apply, an admin approves, and the partner gets a one-time password-setup email. After that they sign in and see **one shared wholesale price in GEL, 18% VAT included**. Suspending a partner takes effect immediately. Partners have a profile page and can reset their password. |
| Admin CMS (`/admin`) | Super-admin only, with TOTP MFA and recovery codes. Covers products (draft/publish review), categories, prices, applications, partners, partner stores, contact messages, media library, structured page builder (draft, preview, publish), banners, settings/SEO, translations, Excel/CSV import and export, email outbox and audit log. |
| Import | `.xlsx` and `.csv` files. Columns are mapped in the UI, then a **dry run** shows per-field diffs. The admin then confirms. **Full-catalogue** imports hide (never delete) SKUs missing from the file, but only after the admin confirms the exact count. **Partial** imports never hide anything. |
| Translation | Georgian → English with Claude, triggered only by an explicit admin action. Output is saved as `DRAFT_REVIEW` and appears publicly only after admin approval. When no API key is set, the CMS shows a disabled state instead. |

## Quick start (local)

```bash
# 1) Postgres (or use your own) — creates databases aspor + aspor_test
docker compose up -d

# 2) Install & configure
cp .env.example .env            # then fill DATABASE_URL, APP_ENCRYPTION_KEY, SESSION_SECRET, SEED_ADMIN_*
npm ci                          # runs `prisma generate`

# 3) Database
npx prisma migrate deploy       # applies prisma/migrations
npm run db:seed                 # categories, system pages, catalogue from seed/ (all DRAFT, no prices), super-admin

# 4) Run
npm run dev                     # http://localhost:3000  → /ka ;  admin: /admin (enrol MFA on first login)
```

Local demo flags in `.env`: `SEED_PUBLISH_DEMO=1` publishes the seeded catalogue, and `SEED_APPROVE_DEMO_EN=1` marks the seeded English copy as approved. **Never set either in production.**

### Commands

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm run lint` | ESLint (next core-web-vitals + TypeScript) |
| `npm run typecheck` | Generates route types, then runs `tsc --noEmit` (strict) |
| `npm test` | Vitest unit + integration tests (needs `TEST_DATABASE_URL`; truncates that database) |
| `npm run test:e2e` | Playwright against `next start` on :3100 with the test database (run `npm run build` first) |
| `npm run db:seed` | Idempotent seed |
| `npm run db:migrate` | `prisma migrate deploy` |

> **Sandbox note:** the environment used to build this project could not download Prisma's native schema engine, because `binaries.prisma.sh` is blocked there. `scripts/prisma-wasm.mjs` applies the same migrations with `@prisma/schema-engine-wasm` (`npm run db:sandbox:deploy`). On a normal machine, in CI and on Vercel, use the standard `prisma migrate` commands.

## Documentation

- `ARCHITECTURE.md`: structure, data model, service boundaries, price-protection design
- `SECURITY.md`: threat model, controls, residual risks
- `DEPLOYMENT.md`: vendor choices, step-by-step production setup, required inputs
- `ADMIN_GUIDE.md`: CMS guide for the administrator (Georgian)
- `TEST_REPORT.md`: what was tested, with results and limitations
- `IMPORT_TEMPLATE.xlsx` / `IMPORT_TEMPLATE.csv`: import template with column documentation (README sheet)

## Seed data provenance

`seed/aspor-catalog.json` and `seed/images/` were generated from the supplier workbook **"Aspor (2).xlsx"** with `scripts/extract_aspor_xlsx.py`:

- 108 model rows were split into **136 colour SKUs**. SKUs with a colour suffix (e.g. `A313-BLACK`) are **provisional** and need confirmation.
- **No prices were imported.** The workbook only contained internal VIP/purchase and cost prices; the B2B column was empty.
- 12 items fit none of the five categories (hubs, OTG, car MP3, power sockets). They are placed in the inactive category "other" for review.
- The workbook has no headphones or phone cases, so those categories are empty ("coming soon").
- Names and specifications are the supplier's English text. Georgian product copy still needs to be written.
