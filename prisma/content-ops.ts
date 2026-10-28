/**
 * One-time content operations for an EXISTING database (the seed never
 * overwrites pages or products that already exist).
 *
 * Each op runs once: completion is recorded in SiteSetting under `ops:<id>`.
 * Runs on every production build (scripts/vercel-build.sh) and locally with
 * `npm run db:ops`. Safe to re-run.
 */
import 'dotenv/config';
import { db } from '../src/lib/db';
import { LEGAL_PAGES } from './legal-content';

type Op = { id: string; run: () => Promise<string> };

async function applyLegalPages() {
  const done: string[] = [];
  for (const lp of LEGAL_PAGES) {
    await db.$transaction(async (tx) => {
      const existing = await tx.page.findUnique({ where: { key: lp.key } });
      const page = existing
        ? await tx.page.update({ where: { id: existing.id }, data: { publishedAt: new Date(), hasDraft: false } })
        : await tx.page.create({ data: { key: lp.key, slug: lp.slug, isSystem: true, publishedAt: new Date() } });
      for (const [locale, title, seoDesc, status] of [['ka', lp.titleKa, lp.seoKa, 'APPROVED'], ['en', lp.titleEn, lp.seoEn, 'DRAFT_REVIEW']] as const) {
        await tx.pageTranslation.upsert({
          where: { pageId_locale: { pageId: page.id, locale } },
          create: { pageId: page.id, locale, title, seoDesc, status },
          update: { title, seoDesc, ...(locale === 'en' ? { status } : {}) },
        });
      }
      await tx.pageSection.deleteMany({ where: { pageId: page.id } });
      for (const revision of ['DRAFT', 'PUBLISHED'] as const) {
        await tx.pageSection.createMany({ data: lp.sections.map((s, i) => ({ pageId: page.id, revision, type: s.type, sortOrder: i, data: s.data, enStatus: 'DRAFT_REVIEW' as const })) });
      }
    });
    done.push(lp.key);
  }
  return `pages updated: ${done.join(', ')}`;
}

const OPS: Op[] = [
  // Owner request 28.10.2026: privacy / cookies rewritten, terms page added.
  { id: 'legal-pages-2026-10-28', run: applyLegalPages },
  {
    // Owner request 28.10.2026: publish every product. Items in the inactive
    // "other" category stay invisible until that category is activated.
    id: 'publish-all-products-2026-10-28',
    run: async () => {
      const r = await db.product.updateMany({ where: { status: 'DRAFT' }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
      return `products published: ${r.count}`;
    },
  },
  // Owner request 28.10.2026 (later): online shop — terms/privacy/cookies updated for online sales.
  { id: 'legal-pages-shop-2026-10-28', run: applyLegalPages },
];

async function main() {
  for (const op of OPS) {
    const key = `ops:${op.id}`;
    if (await db.siteSetting.findUnique({ where: { key } })) continue;
    const summary = await op.run();
    await db.siteSetting.create({ data: { key, valueKa: `${new Date().toISOString()} — ${summary}` } });
    await db.auditLog.create({ data: { action: 'content.op', entityType: 'SiteSetting', entityId: key, meta: { summary } } });
    console.log(`✔ ${op.id}: ${summary}`);
  }
  console.log('content-ops done');
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
