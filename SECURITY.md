# Security

## Assets & threats

| Asset | Main threats | Controls |
|---|---|---|
| Wholesale prices | Leakage to anonymous visitors, crawlers, caches, ex-partners | One reader module (`server/services/pricing.ts`), a live DB status check on every request, explicit `select` DTOs elsewhere, per-request rendering (no shared caches), no prices in metadata, JSON-LD, sitemap or exports outside admin. Tested end-to-end (HTML, RSC payload, JSON-LD, sitemap, API). |
| Admin account | Credential stuffing, phishing, session theft | Argon2id passwords, mandatory TOTP MFA + 8 one-time recovery codes (stored hashed), separate `aspor_admin_sid` cookie scoped to `/admin`, 12 h sessions, per-IP and per-email rate limits, account lockout, full audit log |
| Partner accounts | Enumeration, brute force, takeover via reset | Identical responses for unknown emails, rate limits, lockout after 8 failures (15 min), hashed one-time tokens (setup 72 h, reset 60 min; issuing a new token voids older ones), all sessions revoked on password change and suspension |
| CMS content | Stored XSS, script injection via page builder or rich text | Typed section registry with no arbitrary HTML; allow-list sanitiser on save **and** render; React escaping everywhere else; JSON-LD `<` escaped; link schemes restricted |
| Uploads | Malicious files, polyglots, SVG XSS, oversize | Bytes are decoded with `sharp` (MIME and extension are ignored), only raster formats are allowed, everything is re-encoded to WebP (strips metadata), SVG is rejected, 4 MB limit (Vercel body cap), pixel limit, filenames are sanitised and keys are random |
| Import | Formula injection, zip bombs, malformed files, SSRF via image URLs | ZIP signature check, row/column/cell limits, formulas are never evaluated (cached result only), exports neutralise `= + - @` with a leading `'`, image URLs are https only with public-IP DNS check, no redirects, size/time limits |
| Secrets | Leakage to the browser or logs | Only `NEXT_PUBLIC_*` IDs reach the client; `server-only` guards server modules; `/api/health` returns booleans only; one-time links are redacted from the email log after delivery |

## Implemented controls (checklist)

- **CSRF:** all mutations are Server Actions (Next.js checks Origin against Host). Admin GET routes only download data and require an admin session. Cookies are `SameSite=Lax` + `HttpOnly` + `Secure` (in production).
- **SQL injection:** Prisma parameterised queries only. The two raw queries use tagged templates; the test-only `TRUNCATE` builds identifiers from `pg_tables`.
- **Authorisation:** every admin page **and** every admin action calls `requireAdmin()` itself. The panel layout also checks, but layouts alone are not enough: React Server Components partial rendering can skip a layout when the client claims it already has it. That bypass was found in the internal review, fixed, and is now covered by an E2E test with a crafted `Next-Router-State-Tree`. `requireAdmin()` re-reads the session from the DB and checks role, `status = ACTIVE`, MFA enrolment and `mfaPassed`. Partner self-service actions take the partner ID from the session only and ignore form fields (tested).
- **MFA hardening:** TOTP time steps are single-use (atomic compare-and-set on `totpLastStep`, so replays are rejected). Recovery codes are consumed with an atomic conditional update (no double use under concurrency).
- **Token realm binding:** a reset token issued for an admin cannot be used on the partner form, and vice versa. The role is checked *before* the token is consumed.
- **Open redirect:** the post-login `next` value accepts only `/ka/...` or `/en/...` paths with no control characters, whitespace, backslashes or `//`.
- **Third-party trackers** never load on `/account/*` pages, where one-time tokens appear in the URL.
- **Rate limiting:** Postgres-backed sliding window, safe across serverless instances. Limits: login (10/15 min per IP, 6 per email), reset (5/h), application (5/h), contact (8/h), translation (60/h per admin), MFA (10/15 min).
- **Anti-spam:** honeypot field + HMAC-signed form ticket with a minimum fill time (2.5 s) and a maximum age (3 h); bots get a silent fake success.
- **Headers:** HSTS (preload-ready), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` (keeps tokens in URLs from leaking), `Permissions-Policy`, `X-Robots-Tag: noindex` on admin and account pages.
- **Audit log:** logins (success and failure), MFA events, recovery-code use, approvals, rejections, suspensions, profile changes, product/price changes (records whether a price was set), publish/unpublish, imports, exports, translations, media, settings.

## Admin MFA enrolment

1. The admin is created by the seed (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, removed from the environment afterwards).
2. On first login, `/admin/mfa/setup` shows a QR code and a manual key. Scan it with any TOTP app (Google Authenticator, Microsoft Authenticator, 1Password, Authy…), then enter the code.
3. **8 recovery codes are shown once.** Store them in a password manager or offline. Each code works once and can be used in place of a TOTP code.
4. The CMS stays locked until MFA is enrolled (`ADMIN_MFA_REQUIRED=true`). Never set it to `false` outside local development.
5. New phone: go to Admin → "MFA / აღდგენის კოდები" → confirm with the current code → re-enrol. Lost phone: use a recovery code to sign in, then re-enrol.
6. Lost phone **and** all recovery codes: someone with DB access must reset MFA (`UPDATE "User" SET "totpEnabledAt"=NULL, "totpSecretEnc"=NULL, "recoveryCodes"='{}' WHERE email='…'`), and the admin then re-enrols on next login.

> **Do this immediately after the first deploy.** Before MFA is enrolled, anyone who knows the admin password can enrol their own authenticator.

## Residual risks / notes

- **DNS rebinding in import image fetching:** the target IP is checked before `fetch`, but a malicious DNS server could answer differently on the second lookup. Impact is limited: https only, no redirects, the response must decode as an image. For stronger isolation, fetch through a dedicated egress proxy.
- **Client IP trust:** rate limits use `x-vercel-forwarded-for`, `x-real-ip` and `x-forwarded-for`, which Vercel sets itself. If you deploy behind another proxy, make sure it overwrites these headers.
- **Single super-admin:** there is no admin RBAC, by design. Keep the recovery codes safe.
- **TOTP is phishable.** WebAuthn/passkeys would be a future hardening step.
- **Legal texts** (privacy and cookie policy) are templates marked for local counsel review.
- **Emails that fail permanently** are redacted once retries are exhausted. Until then, the one-time link sits in `EmailLog` so it can be retried; it expires anyway (72 h / 60 min). In production, the `console` provider logs only the recipient and subject, never the body.
- **Import stale-preview guard** compares a SHA-256 fingerprint of the exact planned changes (SKUs, actions, field diffs, hidden SKUs), not just counts.
- **Dependency audit:** `npm audit` reports advisories in transitive dev/test dependencies (create-next-app baseline). Run `npm audit` and update regularly.

## Reporting

Report security issues privately to the site owner (set the contact address in `SiteSetting contact.email`). Do not open public issues.
