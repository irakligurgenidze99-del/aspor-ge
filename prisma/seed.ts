/**
 * ASPOR seed — DEMO / initial content. Run: npm run db:seed
 *
 *  - 5 required categories (+ inactive "other" for items that fit none of them)
 *  - system pages (home, about, privacy, cookies) built from page-builder sections
 *  - products extracted from the client's supplier workbook (seed/aspor-catalog.json),
 *    WITHOUT any prices (the workbook only had internal cost/VIP prices)
 *  - super-admin from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (never hard-coded)
 *
 * Flags (local demo only):
 *  SEED_PUBLISH_DEMO=1     publish catalog products (default: everything stays DRAFT for review)
 *  SEED_APPROVE_DEMO_EN=1  mark seeded English copy APPROVED (default: DRAFT_REVIEW)
 *
 * Idempotent: re-running upserts by SKU / slug / key and never deletes data.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../src/lib/db';
import { hashPassword, passwordPolicyError } from '../src/lib/password';
import { ingestImage } from '../src/server/services/media';
import { slugify } from '../src/lib/slug';

const PUBLISH = process.env.SEED_PUBLISH_DEMO === '1';
const EN_STATUS = process.env.SEED_APPROVE_DEMO_EN === '1' ? 'APPROVED' : 'DRAFT_REVIEW';
const L = (ka: string, en = '') => ({ ka, en });

const CATEGORIES = [
  { slug: 'chargers', ka: 'დამტენები', en: 'Chargers', order: 1 },
  { slug: 'cables', ka: 'კაბელები', en: 'Cables', order: 2 },
  { slug: 'power-banks', ka: 'პაუერბანკები', en: 'Power banks', order: 3 },
  { slug: 'headphones', ka: 'ყურსასმენები', en: 'Headphones & earphones', order: 4 },
  { slug: 'cases', ka: 'ქეისები', en: 'Phone cases', order: 5 },
  { slug: 'other', ka: 'სხვა (განსახილველი)', en: 'Other (to review)', order: 99, inactive: true },
];

async function seedCategories() {
  for (const c of CATEGORIES) {
    const cat = await db.category.upsert({ where: { slug: c.slug }, create: { slug: c.slug, sortOrder: c.order, isActive: !c.inactive }, update: {} });
    await db.categoryTranslation.upsert({ where: { categoryId_locale: { categoryId: cat.id, locale: 'ka' } }, create: { categoryId: cat.id, locale: 'ka', name: c.ka }, update: {} });
    await db.categoryTranslation.upsert({ where: { categoryId_locale: { categoryId: cat.id, locale: 'en' } }, create: { categoryId: cat.id, locale: 'en', name: c.en, status: EN_STATUS }, update: {} });
  }
}

type SeedProduct = { sku: string; category: string; modelNumber: string; nameEn: string; nameKa: string; color: string; colorEn: string; specs: { label: string; value: string }[]; images: string[] };

async function seedProducts() {
  const file = path.join(process.cwd(), 'seed/aspor-catalog.json');
  if (!fs.existsSync(file)) return console.log('seed/aspor-catalog.json not found — skipping products');
  const { products } = JSON.parse(fs.readFileSync(file, 'utf8')) as { products: SeedProduct[] };
  const cats = new Map((await db.category.findMany()).map((c) => [c.slug, c.id]));
  const assetCache = new Map<string, string>();
  let created = 0;
  for (const p of products) {
    if (await db.product.findUnique({ where: { sku: p.sku } })) continue;
    const imageIds: string[] = [];
    for (const rel of p.images) {
      const ref = `seed:${rel}`;
      let id = assetCache.get(ref) ?? (await db.mediaAsset.findFirst({ where: { sourceRef: ref } }))?.id;
      if (!id) {
        const a = await ingestImage(fs.readFileSync(path.join(process.cwd(), rel)), path.basename(rel), { ka: p.nameKa, en: p.nameEn ? `ASPOR ${p.nameEn}` : undefined }, 'products');
        await db.mediaAsset.update({ where: { id: a.id }, data: { sourceRef: ref } });
        id = a.id;
      }
      assetCache.set(ref, id);
      imageIds.push(id);
    }
    const publish = PUBLISH && p.category !== 'other';
    let slug = slugify(`${p.sku} ${p.nameEn}`, 90);
    for (let i = 2; await db.product.findUnique({ where: { slug } }); i++) slug = `${slugify(`${p.sku} ${p.nameEn}`, 86)}-${i}`;
    await db.product.create({
      data: {
        sku: p.sku, slug, categoryId: cats.get(p.category)!, modelNumber: p.modelNumber, color: p.color,
        status: publish ? 'PUBLISHED' : 'DRAFT', publishedAt: publish ? new Date() : null,
        translations: {
          create: [
            { locale: 'ka', name: p.nameKa, status: 'APPROVED', source: 'import:supplier-xlsx' },
            ...(p.nameEn ? [{ locale: 'en', name: `ASPOR ${p.modelNumber.split(' (')[0]} ${p.nameEn}`.trim(), status: EN_STATUS, source: 'import:supplier-xlsx' } as const] : []),
          ],
        },
        attributes: {
          create: [
            ...(p.colorEn ? [{ key: 'color', labelKa: 'ფერი', labelEn: 'Colour', value: p.color, valueEn: p.colorEn, sortOrder: 0 }] : []),
            ...p.specs.map((s, i) => ({ key: `${slugify(s.label, 36).replace(/-/g, '_')}_${i}`, labelKa: s.label, labelEn: /[Ⴀ-ჿ]/.test(s.label) ? null : s.label, value: s.value, sortOrder: i + 1 })),
          ],
        },
        images: { create: imageIds.map((assetId, i) => ({ assetId, sortOrder: i })) },
      },
    });
    created++;
  }
  // A handful of featured items for the home page (demo choice; editable in CMS).
  for (const sku of ['A313-BLACK', 'A386-BLACK', 'A883-EU-WHITE', 'A853-EU-WHITE', 'AC-21-BLACK', 'AC-38-BLACK', 'A389-BLACK', 'A870-EU-WHITE']) {
    await db.product.updateMany({ where: { sku }, data: { featured: true } });
  }
  console.log(`products: ${created} created (${PUBLISH ? 'published demo' : 'all DRAFT — review & publish in CMS'})`);
}

async function upsertPage(key: string, slug: string, titleKa: string, titleEn: string, sections: { type: string; data: object }[], seoDescKa?: string, seoDescEn?: string) {
  const existing = await db.page.findUnique({ where: { key } });
  if (existing) return existing;
  const page = await db.page.create({
    data: {
      key, slug, isSystem: true, publishedAt: new Date(),
      translations: { create: [{ locale: 'ka', title: titleKa, seoDesc: seoDescKa }, { locale: 'en', title: titleEn, seoDesc: seoDescEn, status: EN_STATUS }] },
    },
  });
  for (const rev of ['DRAFT', 'PUBLISHED'] as const) {
    await db.pageSection.createMany({ data: sections.map((s, i) => ({ pageId: page.id, revision: rev, type: s.type, sortOrder: i, data: s.data, enStatus: EN_STATUS })) });
  }
  return page;
}

const LEGAL_NOTE_KA = '<blockquote><strong>სამუშაო ვერსია.</strong> ეს ტექსტი არის შაბლონი და საჭიროებს ადგილობრივი იურისტის განხილვას „პერსონალურ მონაცემთა დაცვის შესახებ“ საქართველოს კანონთან (2023) შესაბამისობისთვის. არ გამოიყენოთ საბოლოო ვერსიად დამტკიცებამდე.</blockquote>';
const LEGAL_NOTE_EN = '<blockquote><strong>Working draft.</strong> This text is a template and must be reviewed by local counsel for compliance with the Law of Georgia on Personal Data Protection (2023). Do not treat as final until approved.</blockquote>';

async function seedPages() {
  const heroAsset = await db.mediaAsset.findFirst({ where: { sourceRef: { contains: 'r11-product' } } });
  await upsertPage('home', '', 'მთავარი', 'Home', [
    {
      type: 'Hero',
      data: {
        eyebrow: L('Power your aspiration', 'Power your aspiration'),
        heading: L('ენერგია, რომელიც თან დაგყვება', 'Power that keeps up with you'),
        subheading: L('ASPOR-ის დამტენები, კაბელები და პაუერბანკები — ერთ კატალოგში, ტექნიკური მახასიათებლებით.', 'ASPOR chargers, cables and power banks — one catalogue, full technical specifications.'),
        ctaLabel: L('კატალოგის ნახვა', 'Browse the catalogue'), ctaHref: '/products',
        secondaryLabel: L('გახდი პარტნიორი', 'Become a partner'), secondaryHref: '/partners/apply',
        imageId: heroAsset?.id ?? '',
      },
    },
    { type: 'CategoryGrid', data: { heading: L('კატეგორიები', 'Categories'), intro: L('', '') } },
    { type: 'FeaturedProducts', data: { heading: L('გამორჩეული პროდუქცია', 'Featured products'), intro: L('', ''), limit: 8 } },
    {
      type: 'BrandStory',
      data: {
        eyebrow: L('ASPOR', 'ASPOR'),
        heading: L('[ბრენდის ისტორია — ჩაანაცვლეთ რეალური ტექსტით]', '[Brand story — replace with real copy]'),
        body: L('ეს ბლოკი დროებითია. ჩაწერეთ ბრენდის ისტორია CMS-ში: გვერდები → მთავარი → ბრენდის ისტორია.', 'Placeholder. Edit in CMS: Pages → Home → Brand story.'),
        stats: [],
      },
    },
    {
      type: 'CTA',
      data: {
        heading: L('საცალო მაღაზია ან დისტრიბუტორი ხართ?', 'Are you a retailer or distributor?'),
        body: L('დამტკიცებული პარტნიორები კატალოგში ხედავენ საბითუმო ფასებს, დღგ-ს ჩათვლით.', 'Approved partners see wholesale prices, VAT included, throughout the catalogue.'),
        buttonLabel: L('განაცხადის შევსება', 'Apply now'), buttonHref: '/partners/apply',
      },
    },
  ], 'ASPOR — დამტენები, კაბელები, პაუერბანკები, ყურსასმენები და ქეისები. B2B პარტნიორობა საქართველოში.', 'ASPOR — chargers, cables, power banks, headphones and phone cases. B2B partnership in Georgia.');

  await upsertPage('about', 'about', 'ჩვენ შესახებ', 'About', [
    { type: 'Hero', data: { eyebrow: L('ASPOR', 'ASPOR'), heading: L('ჩვენ შესახებ', 'About ASPOR'), subheading: L('[ჩაანაცვლეთ: მოკლე აღწერა კომპანიის შესახებ]', '[Replace: short company description]'), ctaLabel: L('', ''), ctaHref: '', secondaryLabel: L('', ''), secondaryHref: '', imageId: '' } },
    { type: 'RichText', data: { heading: L('', ''), body: L('<p>[დროებითი ტექსტი] ბრენდის ისტორია, ღირებულებები და საკონტაქტო ინფორმაცია ემატება CMS-იდან.</p>', '<p>[Placeholder] Brand story, values and contact details are edited in the CMS.</p>') } },
  ]);

  await upsertPage('privacy', 'privacy', 'კონფიდენციალურობის პოლიტიკა', 'Privacy policy', [
    {
      type: 'RichText',
      data: {
        heading: L('კონფიდენციალურობის პოლიტიკა', 'Privacy policy'),
        body: L(
          `${LEGAL_NOTE_KA}<h2>რა მონაცემებს ვაგროვებთ</h2><p>პარტნიორობის განაცხადი: კომპანიის დასახელება, საიდენტიფიკაციო კოდი, საკონტაქტო პირის სახელი, ტელეფონი და ელფოსტა. საკონტაქტო ფორმა: სახელი, ელფოსტა, ტელეფონი (არასავალდებულო) და შეტყობინება. ტექნიკური: IP მისამართის ჰეში უსაფრთხოებისა და სპამისგან დაცვისთვის.</p><h2>მიზანი და საფუძველი</h2><p>განაცხადის განხილვა, პარტნიორის ანგარიშის მართვა და შეკითხვებზე პასუხი — თქვენი თანხმობისა და ხელშეკრულებამდელი ურთიერთობის საფუძველზე.</p><h2>შენახვის ვადა</h2><p>[შესავსებია იურისტთან ერთად]</p><h2>მესამე მხარეები</h2><p>ჰოსტინგი, მონაცემთა ბაზა, ფაილების საცავი და ელფოსტის მომსახურება (დამუშავებლები). ანალიტიკა (Google Analytics, Meta Pixel) — მხოლოდ თანხმობის შემთხვევაში.</p><h2>თქვენი უფლებები</h2><p>გაცნობა, გასწორება, წაშლა, დამუშავების შეწყვეტა და თანხმობის გამოხმობა. მოთხოვნისთვის დაგვიკავშირდით საკონტაქტო გვერდიდან.</p><h2>მონაცემთა დამმუშავებელი</h2><p>[კომპანიის რეკვიზიტები — შესავსებია]</p>`,
          `${LEGAL_NOTE_EN}<h2>What we collect</h2><p>Partner applications: company name, identification code, contact name, phone and email. Contact form: name, email, optional phone and message. Technical: a hashed IP address for security and spam prevention.</p><h2>Purpose and basis</h2><p>Reviewing applications, managing partner accounts and answering enquiries — based on your consent and pre-contractual relations.</p><h2>Retention</h2><p>[To be completed with counsel]</p><h2>Third parties</h2><p>Hosting, database, file storage and email providers (processors). Analytics (Google Analytics, Meta Pixel) only with consent.</p><h2>Your rights</h2><p>Access, rectification, erasure, restriction and withdrawal of consent — contact us via the contact page.</p><h2>Controller</h2><p>[Company details — to be completed]</p>`,
        ),
      },
    },
  ]);

  await upsertPage('cookies', 'cookies', 'Cookie პოლიტიკა', 'Cookie policy', [
    {
      type: 'RichText',
      data: {
        heading: L('Cookie პოლიტიკა', 'Cookie policy'),
        body: L(
          `${LEGAL_NOTE_KA}<h2>აუცილებელი</h2><table><tr><th>Cookie</th><th>მიზანი</th><th>ვადა</th></tr><tr><td>aspor_sid</td><td>პარტნიორის სესია</td><td>30 დღე</td></tr><tr><td>aspor_admin_sid</td><td>ადმინისტრატორის სესია</td><td>12 სთ</td></tr><tr><td>aspor_consent</td><td>თქვენი cookie არჩევანი</td><td>180 დღე</td></tr><tr><td>NEXT_LOCALE</td><td>ენის არჩევანი</td><td>სესია</td></tr></table><h2>ანალიტიკური და მარკეტინგული (მხოლოდ თანხმობით)</h2><p>Google Analytics 4 (_ga, _ga_*), Meta Pixel (_fbp). გამოირთვება „მხოლოდ აუცილებელი“ არჩევისას. არჩევანის შეცვლა შეგიძლიათ ფუტერში „Cookie პარამეტრები“.</p>`,
          `${LEGAL_NOTE_EN}<h2>Essential</h2><table><tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr><tr><td>aspor_sid</td><td>Partner session</td><td>30 days</td></tr><tr><td>aspor_admin_sid</td><td>Admin session</td><td>12 h</td></tr><tr><td>aspor_consent</td><td>Your cookie choice</td><td>180 days</td></tr><tr><td>NEXT_LOCALE</td><td>Language choice</td><td>Session</td></tr></table><h2>Analytics and marketing (consent only)</h2><p>Google Analytics 4 (_ga, _ga_*), Meta Pixel (_fbp). Disabled when you choose “Essential only”. Change your choice any time via “Cookie settings” in the footer.</p>`,
        ),
      },
    },
  ]);
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const pw = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !pw) return console.log('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — admin not created');
  if (passwordPolicyError(pw) || pw.length < 12) throw new Error('SEED_ADMIN_PASSWORD must be ≥12 chars with letters and digits');
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return console.log(`admin ${email} already exists — unchanged`);
  await db.user.create({ data: { email, role: 'SUPER_ADMIN', status: 'ACTIVE', passwordHash: await hashPassword(pw), name: 'Super admin' } });
  console.log(`admin ${email} created — enrol MFA at /admin/mfa/setup on first login`);
}

async function main() {
  await seedCategories();
  await seedProducts();
  await seedPages();
  await seedAdmin();
  console.log('seed done');
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
