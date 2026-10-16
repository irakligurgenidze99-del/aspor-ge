import { test, expect } from '@playwright/test';
import { adminLogin, freshIp, mails, E2E, expectNoPrice } from './utils';

const company = { name: 'შპს E2E მაღაზია', code: '412345678', contact: 'ნინო ტესტი', phone: '+995 555 11 22 33', email: `shop-${Date.now()}@example.test` };

test('apply → admin approves (MFA) → one-time setup → partner sees price → suspend removes access', async ({ browser }) => {
  // 1) Public application
  const pub = await browser.newContext();
  await freshIp(pub);
  const p = await pub.newPage();
  await p.goto('/ka/partners/apply');
  await p.getByLabel('კომპანიის დასახელება').fill(company.name);
  await p.getByLabel('საიდენტიფიკაციო კოდი').fill(company.code);
  await p.getByLabel('საკონტაქტო პირი').fill(company.contact);
  await p.getByLabel('ტელეფონი').fill(company.phone);
  await p.getByLabel('ელფოსტა').fill(company.email);
  await p.getByLabel(/ვეთანხმები/).check();
  await p.getByRole('button', { name: 'განაცხადის გაგზავნა' }).click();
  await expect(p.getByTestId('apply-success')).toBeVisible();
  expect(mails(company.email).some((m) => m.subject.includes('მიღებულია'))).toBe(true);
  expect(mails('ops@example.test').some((m) => m.subject.includes(company.name))).toBe(true);

  // Pending applicant cannot sign in
  await p.goto('/ka/account/login');
  await p.getByLabel('ელფოსტა').fill(company.email);
  await p.getByLabel('პაროლი').fill('whatever123456');
  await p.getByRole('button', { name: 'შესვლა' }).click();
  await expect(p.getByText('ელფოსტა ან პაროლი არასწორია.')).toBeVisible();

  // 2) Admin approves
  const adm = await browser.newContext();
  const a = await adm.newPage();
  await adminLogin(a);
  await a.goto('/admin/applications');
  await a.getByRole('link', { name: company.name }).click();
  await a.getByRole('button', { name: 'დამტკიცება' }).click();
  await a.getByRole('dialog').getByRole('button', { name: 'დამტკიცება' }).click();
  await expect(a.getByRole('link', { name: 'პარტნიორის ანგარიში →' })).toBeVisible();

  // 3) One-time setup link from the approval email
  const approval = mails(company.email).find((m) => m.text.includes('/account/setup?token='))!;
  const link = approval.text.match(/https?:\/\/\S+\/account\/setup\?token=\S+/)![0];
  const url = new URL(link);
  await p.goto(url.pathname + url.search);
  await p.getByLabel('ახალი პაროლი').fill('PartnerPassw0rd');
  await p.getByLabel('გაიმეორეთ პაროლი').fill('PartnerPassw0rd');
  await p.getByRole('button', { name: 'შენახვა' }).click();
  await expect(p.getByText('პაროლი შენახულია')).toBeVisible();
  await p.goto(url.pathname + url.search); // reuse → invalid
  await expect(p.getByText('ბმული არასწორია, ვადაგასულია ან უკვე გამოყენებულია.')).toBeVisible();

  // 4) Login → same price on card and detail
  await p.goto('/ka/account/login');
  await p.getByLabel('ელფოსტა').fill(company.email);
  await p.getByLabel('პაროლი').fill('PartnerPassw0rd');
  await p.getByRole('button', { name: 'შესვლა' }).click();
  await p.waitForURL('**/ka/account');
  await expect(p.getByText(company.code)).toBeVisible();
  await p.goto('/ka/categories/power-banks');
  const cardPrices = p.getByTestId('wholesale-price');
  await expect(cardPrices.first()).toContainText(E2E.priceKa);
  await p.goto('/ka/products/e2e-pb-black');
  await expect(p.getByTestId('wholesale-price').first()).toContainText(E2E.priceKa);
  await expect(p.getByTestId('wholesale-price').first()).toContainText('დღგ-ს ჩათვლით');
  const res = await p.request.get('/ka/products/e2e-pb-black');
  expect(res.headers()['cache-control']).toMatch(/private|no-store|no-cache/);
  expect(res.headers()['cache-control']).not.toMatch(/public|s-maxage/);
  const ld = await p.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.join('')).not.toContain(E2E.price);
  await expect(p.locator('meta[name=description]')).not.toHaveAttribute('content', new RegExp(E2E.price));
  // Product without a price shows "price to be confirmed", not another product's price
  await p.goto('/ka/products/e2e-ch-1');
  await expect(p.getByText('ფასი დაზუსტდება')).toBeVisible();

  // Partner cannot reach admin
  const adminTry = await p.request.get('/admin/api/export?format=csv');
  expect(adminTry.status()).toBe(401);
  await p.goto('/admin');
  await expect(p).toHaveURL(/\/admin\/login/);

  // 5) Admin suspends → price access gone on next request (old cookie)
  await a.goto('/admin/partners');
  await a.getByRole('link', { name: company.name }).click();
  await a.getByRole('button', { name: 'შეჩერება' }).click();
  await a.getByRole('dialog').getByRole('button', { name: 'შეჩერება' }).click();
  await expect(a.getByText('შეჩერებული', { exact: true }).first()).toBeVisible();
  await p.goto('/ka/products/e2e-pb-black');
  await expect(p.getByTestId('wholesale-price')).toHaveCount(0);
  await expectNoPrice(await p.content());

  // Suspended partner signing in gets a suspension message, no price
  await p.goto('/ka/account/login');
  await p.getByLabel('ელფოსტა').fill(company.email);
  await p.getByLabel('პაროლი').fill('PartnerPassw0rd');
  await p.getByRole('button', { name: 'შესვლა' }).click();
  await expect(p.getByText('თქვენი ანგარიში დროებით შეჩერებულია')).toBeVisible();

  // 6) Reactivate → login → logout removes access
  await a.getByRole('button', { name: 'აღდგენა' }).click();
  await a.getByRole('dialog').getByRole('button', { name: 'აღდგენა' }).click();
  await expect(a.getByText('აქტიური', { exact: true }).first()).toBeVisible();
  await p.getByLabel('პაროლი').fill('PartnerPassw0rd');
  await p.getByRole('button', { name: 'შესვლა' }).click();
  await p.waitForURL('**/ka/account');
  await p.goto('/ka/products/e2e-pb-black');
  await expect(p.getByTestId('wholesale-price').first()).toBeVisible();
  await p.goto('/ka/account');
  await p.getByRole('button', { name: 'გასვლა' }).click();
  await p.goto('/ka/products/e2e-pb-black');
  await expect(p.getByTestId('wholesale-price')).toHaveCount(0);
});

test('admin: password alone is not enough (MFA), wrong TOTP rejected', async ({ page }) => {
  await freshIp(page.context());
  await page.goto('/admin/login');
  await page.getByLabel('ელფოსტა').fill(E2E.adminEmail);
  await page.getByLabel('პაროლი').fill(E2E.adminPassword);
  await page.getByRole('button', { name: 'შესვლა' }).click();
  await page.waitForURL('**/admin/mfa');
  await page.goto('/admin/products');
  await expect(page).toHaveURL(/\/admin\/mfa/);
  await page.getByLabel(/6-ნიშნა/).fill('000000');
  await page.getByRole('button', { name: 'დადასტურება' }).click();
  await expect(page.getByText('კოდი არასწორია.')).toBeVisible();
});

test('forgot-password response is identical for unknown emails', async ({ page }) => {
  await freshIp(page.context());
  await page.goto('/ka/account/forgot');
  await page.getByLabel('ელფოსტა').fill('nobody-here@example.test');
  await page.getByRole('button', { name: 'ბმულის გაგზავნა' }).click();
  await expect(page.getByText('თუ ამ ელფოსტით აქტიური ანგარიში არსებობს')).toBeVisible();
  expect(mails('nobody-here@example.test')).toHaveLength(0);
});
