/** Accepts site-relative paths ("/ka/products") or https/mailto/tel URLs. Rejects javascript:, data:, etc. */
export function isSafeHref(href: string): boolean {
  const h = href.trim();
  if (!h) return false;
  if (h.startsWith('/') && !h.startsWith('//')) return !/[\u0000-\u001f\\]/.test(h);
  if (h.startsWith('#')) return true;
  try {
    const u = new URL(h);
    return ['https:', 'mailto:', 'tel:'].includes(u.protocol);
  } catch {
    return false;
  }
}

export function safeHref(href: string | null | undefined, fallback = '#'): string {
  return href && isSafeHref(href) ? href.trim() : fallback;
}

/** Prevent open redirects: only same-site absolute paths. */
export function safeRedirectPath(p: string | null | undefined, fallback: string): string {
  // Only same-site locale paths; no control chars/whitespace (browsers strip \t\n → "//evil"), no backslashes.
  if (!p || /[\u0000-\u0020\u007f\\]/.test(p)) return fallback;
  if (!/^\/(ka|en)(\/[A-Za-z0-9\-_/?=&%.]*)?$/.test(p) || p.includes('//')) return fallback;
  return p;
}
