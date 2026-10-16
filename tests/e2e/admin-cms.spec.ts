import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { adminLogin } from './utils';

test('page builder: add, edit, reorder, hide, preview, publish; scripts never execute', async ({ page }) => {
  await adminLogin(page);
  await page.goto('/admin/pages');
  await page.getByRole('link', { name: /about/ }).first().click();
  // add a RichText section with a hostile payload
  await page.getByLabel('სექციის ტიპი').selectOption('RichText');
  await page.getByRole('button', { name: 'დამატება' }).click();
  await expect(page.getByRole('heading', { name: /^2\. ტექსტური ბლოკი/ })).toBeVisible();
  const last = page.locator('section').filter({ has: page.getByRole('heading', { name: /ტექსტური ბლოკი/ }) }).last();
  await last.getByLabel('ქართული').nth(1).fill('<p>ახალი E2E აბზაცი</p><script>window.__pwned=1</script><img src=x onerror="window.__pwned=1">');
  await last.getByRole('button', { name: 'სექციის შენახვა' }).click();
  await expect(last.getByText('შენახულია (დრაფტი)')).toBeVisible();
  // not yet public
  const pub0 = await page.request.get('/ka/about');
  expect(await pub0.text()).not.toContain('ახალი E2E აბზაცი');
  // move it up, preview
  await last.getByRole('button', { name: 'ზემოთ' }).click();
  await expect(page.locator('section').filter({ has: page.getByRole('heading', { name: /^1\. ტექსტური ბლოკი/ }) }).getByLabel('ქართული').nth(1)).toHaveValue(/ახალი E2E/);
  const preview = await page.context().newPage();
  await preview.goto(page.url().replace(/\/admin\/pages\/(\w+).*/, '/admin/preview/$1?locale=ka'));
  await expect(preview.getByText('ახალი E2E აბზაცი')).toBeVisible();
  expect(await preview.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  // publish
  await page.reload();
  await page.locator('form').filter({ has: page.getByRole('button', { name: 'გამოქვეყნება' }) }).getByRole('button', { name: 'გამოქვეყნება' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'გამოქვეყნება' }).click();
  await expect(page.getByText('დრაფტი = გამოქვეყნებული')).toBeVisible();
  await page.goto('/ka/about');
  await expect(page.getByText('ახალი E2E აბზაცი')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  const html = await page.content();
  expect(html).not.toContain('<script>window.__pwned');
  expect(html).not.toContain('onerror');
});

test('import: partial CSV → mapping → dry run (no changes) → confirm → product created', async ({ page }) => {
  await adminLogin(page);
  const csv = 'sku,category,name_ka,wholesale_price_gel_vat_included,status,specifications\nE2E-IMP-1,cables,იმპორტირებული კაბელი,9.99,published,"სიგრძე: 1m"\n';
  fs.writeFileSync('.e2e/e2e-import.csv', csv);
  await page.goto('/admin/imports');
  await page.getByLabel(/^ფაილი/).setInputFiles('.e2e/e2e-import.csv');
  await page.getByRole('button', { name: 'ატვირთვა და სვეტების მიბმა' }).click();
  await page.waitForURL(/\/admin\/imports\/\w+/);
  await page.getByRole('button', { name: /შემოწმება \(dry run\)/ }).click();
  await expect(page.getByRole('cell', { name: 'E2E-IMP-1' })).toBeVisible();
  const before = await page.request.get('/ka/products?q=E2E-IMP-1');
  expect(await before.text()).not.toContain('იმპორტირებული კაბელი');
  await page.getByLabel(/ვნახე ცვლილებები/).check();
  await page.getByRole('button', { name: 'იმპორტის დადასტურება' }).click();
  await expect(page.getByText(/იმპორტი დასრულდა/).first()).toBeVisible();
  await page.goto('/ka/products?q=E2E-IMP-1');
  await expect(page.getByText('იმპორტირებული კაბელი')).toBeVisible();
});

test('full-catalog import shows hide warning with count and sample SKUs', async ({ page }) => {
  await adminLogin(page);
  fs.writeFileSync('.e2e/e2e-full.csv', 'sku,category,name_ka\nE2E-PB-BLACK,power-banks,E2E პაუერბანკი შავი\n');
  await page.goto('/admin/imports');
  await page.getByLabel(/^ფაილი/).setInputFiles('.e2e/e2e-full.csv');
  await page.getByLabel(/სრული კატალოგი/).check();
  await page.getByRole('button', { name: 'ატვირთვა და სვეტების მიბმა' }).click();
  await page.waitForURL(/\/admin\/imports\/\w+/);
  await page.getByRole('button', { name: /შემოწმება \(dry run\)/ }).click();
  await expect(page.getByText(/SKU დაიმალება \(არ წაიშლება\)/)).toBeVisible();
  await expect(page.getByText(/E2E-PB-WHITE/).first()).toBeVisible();
  await page.getByRole('button', { name: 'გაუქმება' }).click(); // do not commit in E2E
  await page.waitForURL(/\/admin\/imports$/);
});

test('admin product publication workflow & translation disabled state', async ({ page }) => {
  await adminLogin(page);
  await page.goto('/admin/products/new');
  await page.getByLabel('SKU').fill('E2E-NEW-1');
  await page.getByLabel('კატეგორია').selectOption({ label: 'ქეისები' });
  await page.getByLabel('დასახელება (ქართ.)').fill('E2E ქეისი');
  await page.getByRole('button', { name: 'შენახვა' }).first().click();
  await page.waitForURL(/created=1/);
  expect((await page.request.get('/ka/categories/cases')).status()).toBe(200);
  expect(await (await page.request.get('/ka/categories/cases')).text()).not.toContain('E2E-NEW-1');
  await expect(page.getByRole('button', { name: 'Claude-ით თარგმნა — გამორთულია' })).toBeVisible();
  await page.getByRole('button', { name: 'განხილულია — გამოქვეყნება' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'გამოქვეყნება' }).click();
  await expect(page.getByText('გამოქვეყნებული').first()).toBeVisible();
  expect(await (await page.request.get('/ka/categories/cases')).text()).toContain('E2E-NEW-1');
});
