/**
 * E2E fixtures — TEST DATA ONLY (aspor_test database). Run via global-setup.
 * Deliberately unique price (137.45) so leakage checks can grep for it.
 */
import 'dotenv/config';
import { db } from '../../src/lib/db';
import { hashPassword } from '../../src/lib/password';
import { encrypt } from '../../src/lib/crypto';

import { E2E } from './constants';
export { E2E };

async function main() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(',')} RESTART IDENTITY CASCADE`);
  const cats = ['chargers', 'cables', 'power-banks', 'headphones', 'cases'];
  const names: Record<string, [string, string]> = { chargers: ['დამტენები', 'Chargers'], cables: ['კაბელები', 'Cables'], 'power-banks': ['პაუერბანკები', 'Power banks'], headphones: ['ყურსასმენები', 'Headphones'], cases: ['ქეისები', 'Cases'] };
  const ids: Record<string, string> = {};
  for (const [i, slug] of cats.entries()) {
    const c = await db.category.create({ data: { slug, sortOrder: i, translations: { create: [{ locale: 'ka', name: names[slug][0] }, { locale: 'en', name: names[slug][1], status: 'APPROVED' }] } } });
    ids[slug] = c.id;
  }
  const mk = (sku: string, cat: string, ka: string, en: string | null, o: { price?: string; status?: 'DRAFT' | 'PUBLISHED'; enStatus?: 'APPROVED' | 'DRAFT_REVIEW'; color?: string } = {}) =>
    db.product.create({
      data: {
        sku, slug: sku.toLowerCase(), categoryId: ids[cat], status: o.status ?? 'PUBLISHED', color: o.color,
        translations: { create: [{ locale: 'ka', name: ka, description: `${ka} — აღწერა` }, ...(en ? [{ locale: 'en', name: en, status: o.enStatus ?? 'APPROVED' }] : [])] },
        attributes: { create: [{ key: 'capacity', labelKa: 'ტევადობა', labelEn: 'Capacity', value: '10000mAh' }] },
        ...(o.price ? { price: { create: { amountGel: o.price } } } : {}),
      },
    });
  await mk('E2E-PB-BLACK', 'power-banks', 'E2E პაუერბანკი შავი', 'E2E Power bank black', { price: E2E.price, color: 'შავი' });
  await mk('E2E-PB-WHITE', 'power-banks', 'E2E პაუერბანკი თეთრი', 'E2E Power bank white', { price: E2E.price, color: 'თეთრი' });
  await mk('E2E-CH-1', 'chargers', 'E2E დამტენი', 'E2E Charger', { enStatus: 'DRAFT_REVIEW' });
  await mk('E2E-CB-1', 'cables', 'E2E კაბელი', null);
  await mk('E2E-DRAFT', 'cables', 'E2E დრაფტი', null, { status: 'DRAFT', price: '1.00' });

  const page = (key: string, slug: string, titleKa: string, titleEn: string, sections: { type: string; data: object; en?: 'APPROVED' | 'DRAFT_REVIEW' }[]) =>
    db.page.create({
      data: {
        key, slug, isSystem: true, publishedAt: new Date(),
        translations: { create: [{ locale: 'ka', title: titleKa }, { locale: 'en', title: titleEn, status: 'APPROVED' }] },
        sections: { create: (['DRAFT', 'PUBLISHED'] as const).flatMap((revision) => sections.map((s, i) => ({ revision, type: s.type, sortOrder: i, data: s.data, enStatus: s.en ?? 'APPROVED' }))) },
      },
    });
  const L = (ka: string, en = '') => ({ ka, en });
  await page('home', '', 'მთავარი', 'Home', [
    { type: 'Hero', data: { eyebrow: L('E2E', 'E2E'), heading: L('E2E სათაური', 'E2E heading'), subheading: L('ქვე', 'sub'), ctaLabel: L('კატალოგი', 'Catalogue'), ctaHref: '/products', secondaryLabel: L(''), secondaryHref: '', imageId: '' } },
    { type: 'CategoryGrid', data: { heading: L('კატეგორიები', 'Categories'), intro: L('') } },
    { type: 'FeaturedProducts', data: { heading: L('გამორჩეული', 'Featured'), intro: L(''), limit: 4 } },
    { type: 'CTA', data: { heading: L('უნვერიფიცირებული EN', 'UNREVIEWED MACHINE TEXT'), body: L(''), buttonLabel: L(''), buttonHref: '' }, en: 'DRAFT_REVIEW' },
  ]);
  for (const k of ['about', 'privacy', 'cookies']) await page(k, k, k, k, [{ type: 'RichText', data: { heading: L(k, k), body: L(`<p>${k} ტექსტი</p>`, `<p>${k} text</p>`) } }]);

  await db.user.create({
    data: { email: E2E.adminEmail, role: 'SUPER_ADMIN', status: 'ACTIVE', passwordHash: await hashPassword(E2E.adminPassword), totpSecretEnc: encrypt(E2E.totpSecret), totpEnabledAt: new Date(), recoveryCodes: [] },
  });
}

if (process.argv[1]?.endsWith('fixtures.ts')) main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
