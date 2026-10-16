import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoPrice, freshIp } from './utils';

test.beforeEach(async ({ context }) => freshIp(context));

test('anonymous visitor: products & specs visible, no wholesale price anywhere', async ({ page, request }) => {
  await page.goto('/ka/products');
  await expect(page.getByRole('heading', { level: 1, name: 'პროდუქცია' })).toBeVisible();
  await expect(page.getByText('E2E-PB-BLACK')).toBeVisible();
  await expect(page.getByText('E2E-DRAFT')).toHaveCount(0);
  await expect(page.locator('[data-testid=wholesale-price]')).toHaveCount(0);

  await page.goto('/ka/products/e2e-pb-black');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E პაუერბანკი შავი');
  await expect(page.getByRole('row', { name: /ტევადობა/ })).toContainText('10000mAh');
  await expectNoPrice(await page.content());

  // Raw HTML, RSC payloads, JSON-LD, metadata, sitemap, API
  for (const path of ['/ka', '/en', '/ka/products', '/en/products', '/ka/products/e2e-pb-black', '/en/products/e2e-pb-black', '/ka/categories/power-banks', '/sitemap.xml', '/robots.txt', '/api/health']) {
    const html = await (await request.get(path)).text();
    await expectNoPrice(html);
    const rsc = await (await request.get(path, { headers: { RSC: '1' } })).text();
    await expectNoPrice(rsc);
  }
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.join('')).toContain('"@type":"Product"');
  expect(ld.join('')).not.toMatch(/offers|price/i);
  // Private routes are not cached publicly
  const acc = await request.get('/ka/account/login');
  expect(acc.headers()['cache-control']).toMatch(/no-store|private/);
  expect(acc.headers()['x-robots-tag']).toMatch(/noindex/);
});

test('draft product is 404; SKU search and categories work; colour variants are separate products', async ({ page }) => {
  const r = await page.goto('/ka/products/e2e-draft');
  expect(r?.status()).toBe(404);
  await page.goto('/ka/products');
  await page.getByLabel('ძიება დასახელებით ან SKU-ით').fill('PB-WHITE');
  await page.getByRole('button', { name: 'ძიება' }).click();
  await expect(page.getByText('1 პროდუქტი')).toBeVisible();
  await expect(page.getByText('E2E-PB-WHITE')).toBeVisible();
  await page.goto('/ka/products');
  for (const name of ['დამტენები', 'კაბელები', 'პაუერბანკები', 'ყურსასმენები', 'ქეისები']) await expect(page.getByRole('navigation', { name: 'კატეგორიები' }).getByRole('link', { name })).toBeVisible();
  await page.getByRole('navigation', { name: 'კატეგორიები' }).getByRole('link', { name: 'პაუერბანკები' }).click();
  await expect(page).toHaveURL(/\/ka\/categories\/power-banks/);
  await expect(page.getByText('2 პროდუქტი')).toBeVisible();
  await page.goto('/ka/categories/headphones');
  await expect(page.getByText('ამ კრიტერიუმით პროდუქტი ვერ მოიძებნა.')).toBeVisible();
});

test('SEO: locale URLs, canonical, hreflang, robots, sitemap', async ({ page, request }) => {
  await page.goto('/ka/products/e2e-pb-black');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ka');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/ka\/products\/e2e-pb-black$/);
  await expect(page.locator('link[rel=alternate][hreflang=en]')).toHaveAttribute('href', /\/en\/products\/e2e-pb-black$/);
  await expect(page.locator('link[rel=alternate][hreflang=x-default]')).toHaveAttribute('href', /\/ka\/products\/e2e-pb-black$/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /E2E/);
  // English without approved translation → Georgian fallback, noindex, no hreflang
  await page.goto('/en/products/e2e-ch-1');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E დამტენი');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('link[rel=alternate][hreflang=en]')).toHaveCount(0);
  // Unreviewed English page-builder text never appears publicly
  await page.goto('/en');
  await expect(page.getByText('UNREVIEWED MACHINE TEXT')).toHaveCount(0);
  await expect(page.getByText('E2E heading')).toBeVisible();

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Disallow: \/admin/);
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
  const sm = await (await request.get('/sitemap.xml')).text();
  expect(sm).toContain('/ka/products/e2e-pb-black');
  expect(sm).toContain('/en/products/e2e-pb-black');
  expect(sm).not.toContain('/en/products/e2e-ch-1'); // no approved EN
  expect(sm).not.toContain('e2e-draft');
  expect(sm).not.toContain('/admin');
  const root = await request.get('/', { maxRedirects: 0 });
  expect([307, 308]).toContain(root.status());
  expect(root.headers().location).toMatch(/\/ka$/);
});

test('contact form stores message', async ({ page }) => {
  await page.goto('/ka/contact');
  await page.getByLabel('სახელი').fill('ტესტი');
  await page.getByLabel('ელფოსტა').fill('visitor@example.test');
  await page.getByRole('textbox', { name: /^შეტყობინება/ }).fill('გამარჯობა, ეს არის სატესტო შეტყობინება.');
  await page.getByLabel(/ვეთანხმები/).check();
  await page.getByRole('button', { name: 'გაგზავნა' }).click();
  await expect(page.getByTestId('contact-success')).toBeVisible();
});

test('forms show accessible validation errors', async ({ page }) => {
  await page.goto('/ka/partners/apply');
  await page.getByRole('button', { name: 'განაცხადის გაგზავნა' }).click();
  await expect(page.getByLabel('საიდენტიფიკაციო კოდი')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('კოდი უნდა იყოს 9 ან 11 ციფრი')).toBeVisible();
  await expect(page.getByText('საჭიროა თანხმობა')).toBeVisible();
});

test('accessibility: axe (WCAG 2.2 AA rules) on key public pages', async ({ page }) => {
  for (const path of ['/ka', '/ka/products', '/ka/products/e2e-pb-black', '/ka/partners/apply', '/ka/contact', '/en/where-to-buy', '/ka/account/login']) {
    await page.goto(path);
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(res.violations.map((v) => `${path}: ${v.id} — ${v.nodes.length} × ${v.nodes[0]?.target}`)).toEqual([]);
  }
});

test('keyboard: skip link and visible focus', async ({ page }) => {
  await page.goto('/ka');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'მთავარ შინაარსზე გადასვლა' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle);
  expect(outline).not.toBe('none');
});

test('admin data is not reachable unauthenticated, even with a crafted RSC router-state (layout-skip)', async ({ request }) => {
  const tree = ['', { children: ['admin', { children: ['(panel)', { children: ['audit', { children: ['__PAGE__', {}] }] }] }] }, null, null, true];
  for (const path of ['/admin/products', '/admin/partners', '/admin/imports', '/admin/audit']) {
    const variants: Record<string, string>[] = [{}, { RSC: '1' }, { RSC: '1', 'Next-Router-State-Tree': encodeURIComponent(JSON.stringify(tree)) }];
    for (const headers of variants) {
      const res = await request.get(path, { headers, maxRedirects: 0 });
      const body = await res.text();
      await expectNoPrice(body);
      expect(body).not.toContain('E2E-PB-BLACK');
      expect(body).not.toContain('e2e-admin@example.test');
    }
  }
  expect((await request.get('/admin/api/export?format=csv')).status()).toBe(401);
});
