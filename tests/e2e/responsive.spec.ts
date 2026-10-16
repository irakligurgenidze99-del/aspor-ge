import { test, expect } from '@playwright/test';
import { freshIp } from './utils';

test.use({ reducedMotion: 'reduce' });

test('mobile: no horizontal overflow, menu works with keyboard/escape, images are optimised', async ({ page, context }) => {
  await freshIp(context);
  for (const path of ['/ka', '/ka/products', '/ka/products/e2e-pb-black', '/ka/partners/apply', '/en/contact']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
  await page.goto('/ka');
  const btn = page.locator('button[aria-controls="mobile-nav"]');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#mobile-nav').getByRole('link', { name: 'პროდუქცია' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-nav')).toHaveCount(0);
  await page.goto('/ka/products');
  const src = await page.locator('header img').first().getAttribute('src');
  expect(src).toMatch(/\/_next\/image\?url=/); // responsive, optimised images via next/image
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  const durations = await page.evaluate(() => [...document.querySelectorAll('[class*="transition"]')].map((e) => parseFloat(getComputedStyle(e).transitionDuration)));
  expect(durations.length).toBeGreaterThan(0);
  expect(Math.max(...durations)).toBeLessThan(0.05);
});
