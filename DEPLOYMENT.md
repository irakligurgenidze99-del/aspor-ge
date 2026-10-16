# Deployment (Vercel)

> **Nothing has been deployed.** No accounts were created, no DNS was changed and no secrets exist yet. This is the exact checklist for when you have the accounts and give the go-ahead.

## Vendor choices

Assessed for cost at this site's scale (~500 SKUs, low traffic, B2B), fit with Vercel, and lock-in. All three sit behind adapters or environment variables and can be swapped.

| Need | Choice | Why | Cost at start* | Alternatives (adapter-compatible) |
|---|---|---|---|---|
| Hosting | **Vercel** | Native Next.js 16 support, cron, preview deployments | Hobby is free, but **Pro (~$20/mo) is needed for commercial use** | Any Node 22 host (`next start`) |
| PostgreSQL | **Neon** (region `aws-eu-central-1` Frankfurt, close to `fra1`) | Serverless Postgres, Vercel Marketplace integration, branching for previews, pooled connection string | Free: 1 GB storage and 100 CU-hours per project (enough at launch). Launch plan is pay-as-you-go (≈$0.35/GB-month storage, ≈$0.106/CU-hour) | Supabase, Railway, AWS RDS (standard `pg` URL) |
| Object storage | **Cloudflare R2** + custom domain `media.aspor.ge` | S3 API, **no egress fees** (images are the main traffic), cheap | Free: 10 GB-month, 1 M Class A / 10 M Class B ops. Then $0.015/GB-month | AWS S3, Backblaze B2, Vercel Blob (would need a new adapter) |
| Transactional email | **Resend** | Simple HTTP API, good deliverability, DKIM/SPF setup guide | Free: 3,000 emails/month, 100/day, 1 domain. Pro ~$20/mo | Postmark, AWS SES (new provider class in `server/email/provider.ts`) |
| AI translation | **Anthropic Claude API** | Required by spec | Pay per token (logged per request in CMS → თარგმანები) | — |

\*Prices were checked in Oct 2026 from public pricing pages and may change. Confirm before you sign up: neon.com/pricing, developers.cloudflare.com/r2/pricing, resend.com/pricing, vercel.com/pricing.

## Inputs still required (user-supplied)

| # | Input | Used for | Status |
|---|---|---|---|
| 1 | Vercel account (Pro for commercial use) | Hosting | ❌ needed |
| 2 | Neon account + project (Frankfurt) | `DATABASE_URL`, `DIRECT_DATABASE_URL` | ❌ needed |
| 3 | Cloudflare account + R2 bucket + API token + custom domain | `S3_*`, `STORAGE_PUBLIC_BASE_URL` | ❌ needed |
| 4 | Resend account + verified domain `aspor.ge` (DNS records) | `RESEND_API_KEY`, `EMAIL_FROM` | ❌ needed |
| 5 | DNS access for aspor.ge | Vercel A/CNAME, Resend DKIM/SPF, R2 custom domain | ❌ needed |
| 6 | Admin email + strong password | `SEED_ADMIN_*` | ❌ needed |
| 7 | Notification inbox for applications and contact messages | `ADMIN_NOTIFY_EMAIL` | ❌ needed |
| 8 | Anthropic API key + current model ID | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | optional |
| 9 | GA4 Measurement ID, Meta Pixel ID, Search Console token | `NEXT_PUBLIC_*` | optional |
| 10 | Real B2B prices (GEL incl. VAT) | Import / CMS | ❌ the supplied workbook had none |
| 11 | Confirmed SKUs per colour, Georgian product names and descriptions | Catalogue | ⚠ seeded SKUs are provisional |
| 12 | Brand story, About text, contact details (address, phone, email, hours) | CMS | ❌ placeholders shown |
| 13 | Partner-store directory (name, city, address, phone) | CMS → მაღაზიები | ❌ empty |
| 14 | Headphones and phone-case products | Catalogue | ❌ not in workbook |
| 15 | Privacy and cookie policy approved by Georgian counsel | CMS pages | ⚠ templates marked "draft" |
| 16 | Higher-resolution white-background photos (optional) | Media | ⚠ workbook images used (≤1400 px) |

## Current live setup (Oct 2026)

- Vercel project **`aspor-ge`** (`prj_Z7jSOMCrdFCn1tsnP37fzbz8dGEO`), Hobby plan, functions region `fra1`. Vercel Authentication protects `*.vercel.app` URLs, so only the account owner can view them until a custom domain is added.
- **Storage:** Vercel Blob store `aspor-media` (fra1, public), already connected to the project (`STORAGE_PROVIDER=vercel-blob`). Cloudflare R2 is no longer required, though the S3 adapter remains available.
- **Env already set:** `APP_ENCRYPTION_KEY`, `SESSION_SECRET`, `CRON_SECRET` (sensitive, generated), `ADMIN_MFA_REQUIRED=true`, `EMAIL_PROVIDER=console`, `EMAIL_FROM`, `STORAGE_PROVIDER`, `APP_URL`/`NEXT_PUBLIC_SITE_URL=https://aspor-ge.vercel.app`, `SEED_ON_BUILD=1`.
- **Still to do:**
  1. Connect Neon in Storage, which provides `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
  2. The owner adds `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.
  3. Push the code to GitHub and link the repository.
- **After the first successful deploy:** delete `SEED_ON_BUILD` and `SEED_ADMIN_PASSWORD`, enrol MFA, then publish the products.
- **Indexing:** search engines are blocked until `ALLOW_INDEXING=1` is set, which should happen only on the final aspor.ge domain.

## Step-by-step

### 1. Database (Neon)
1. Create a project in region **AWS Europe Central (Frankfurt)**, database `aspor`.
2. Copy the **pooled** connection string into `DATABASE_URL` and the **direct** one into `DIRECT_DATABASE_URL`. Both need `?sslmode=require`.

### 2. Storage (Cloudflare R2)
1. Create bucket `aspor-media` and connect the custom domain `media.aspor.ge` (R2 → Settings → Custom Domains) so objects are publicly readable.
2. Create an R2 API token with **Object Read & Write** scoped to that bucket.
3. Set `STORAGE_PROVIDER=s3`, `S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, `S3_REGION=auto`, `S3_BUCKET=aspor-media`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_BASE_URL=https://media.aspor.ge`.
   `next.config.ts` allows that host for `next/image` automatically.

### 3. Email (Resend)
1. Add domain `aspor.ge` (or `mail.aspor.ge`) and create the SPF/DKIM DNS records it shows. Wait until it says **Verified**.
2. Set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM="ASPOR <no-reply@aspor.ge>"`, `ADMIN_NOTIFY_EMAIL`.

### 4. Vercel project
1. Import the Git repository and choose Framework **Next.js**. The build command comes from `vercel.json` (`npm run vercel-build` = `prisma generate && prisma migrate deploy && next build`). The region is `fra1`.
2. Add every variable from `.env.example` for **Production**. Generate the secrets with `openssl rand -base64 48`.
   - `APP_URL` and `NEXT_PUBLIC_SITE_URL` = `https://aspor.ge`
   - `ADMIN_MFA_REQUIRED=true`
   - `CRON_SECRET` (Vercel sends it as `Authorization: Bearer …` to `/api/cron/emails`, every 15 minutes per `vercel.json`. Sub-daily crons need Vercel Pro; on Hobby, change the schedule to daily)
   - **Preview environment:** use a separate Neon branch or database, and storage/email set to test values. `robots.txt` automatically disallows everything on previews.
3. Deploy, then check `https://<deployment>/api/health` → `{"status":"ok","db":true,…}`.

### 5. Seed (once)
From a trusted machine, with production `DATABASE_URL` and `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` set, and `STORAGE_PROVIDER=s3` + `S3_*` so seed images go to R2:
```bash
npm ci && npx prisma migrate deploy && npm run db:seed
```
Do **not** set `SEED_PUBLISH_DEMO` or `SEED_APPROVE_DEMO_EN`. All products stay DRAFT for review. Afterwards, remove `SEED_ADMIN_PASSWORD` from wherever it was stored.

### 6. Domain
Add `aspor.ge` and `www.aspor.ge` in Vercel → Domains, create the DNS records Vercel shows, and set `www` to redirect to the apex.

### 7. First login and go-live checklist
- [ ] `/admin/login` → enrol MFA → store the recovery codes
- [ ] Settings: contact email, phone, address, hours
- [ ] Replace placeholder copy (Home → brand story, About)
- [ ] Review the seeded products: SKUs, Georgian names, categories, then publish
- [ ] Import real wholesale prices (partial import; download the template from CMS → Import)
- [ ] Add partner stores
- [ ] Have counsel approve the privacy and cookie texts, then remove the "working draft" notes
- [ ] English: translate (Claude or manually) → review → approve
- [ ] Analytics IDs (optional) → redeploy (`NEXT_PUBLIC_*` values are inlined at build time)
- [ ] Search Console: add the property, use the HTML-tag token from `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, submit `https://aspor.ge/sitemap.xml`
- [ ] Send a test application end-to-end (application → approval → setup email arrives → partner login shows prices)

## Operations

- **Health:** `GET /api/health` returns 200 or 503 with booleans only. Point an uptime monitor at it.
- **Logs:** Vercel → Logs. Email failures log `[email] delivery failed`, and translation failures are listed in CMS → თარგმანები.
- **Error tracking:** add Sentry or similar via `instrumentation.ts` if needed (not included).
- **Backups:** Neon has point-in-time restore (retention depends on plan). R2 objects are immutable by key; consider bucket lifecycle and versioning.
- **Migrations:** run `npx prisma migrate dev --name <change>` locally, commit `prisma/migrations`, and Vercel applies them at build time.
- **Large imports:** Vercel limits request bodies to ~4.5 MB and function time to the plan maximum. Imports are capped at 4 MB / 5,000 rows. Split bigger catalogues into partial imports. A full-catalogue import must be one file.
