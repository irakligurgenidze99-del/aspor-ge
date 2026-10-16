import { requireAdmin } from '@/server/auth/guards';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Card, PageHead } from '@/components/admin/shell';
import { Notice } from '@/components/ui/field';
import { translationConfig } from '@/server/services/translation';

export const metadata = { title: 'მიმოხილვა' };

export default async function Dashboard() {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const [pendingApps, newMsgs, drafts, published, hidden, noPrice, enReview, failedEmails, partners] = await Promise.all([
    db.partnershipApplication.count({ where: { status: 'PENDING' } }),
    db.contactMessage.count({ where: { status: 'NEW' } }),
    db.product.count({ where: { status: 'DRAFT' } }),
    db.product.count({ where: { status: 'PUBLISHED', isHidden: false } }),
    db.product.count({ where: { isHidden: true } }),
    db.product.count({ where: { price: null } }),
    db.productTranslation.count({ where: { locale: 'en', status: 'DRAFT_REVIEW' } }),
    db.emailLog.count({ where: { status: 'FAILED' } }),
    db.b2BPartner.count({ where: { status: 'ACTIVE' } }),
  ]);
  const tr = translationConfig();
  const tiles: [string, number, string][] = [
    ['ახალი განაცხადები', pendingApps, '/admin/applications'],
    ['ახალი შეტყობინებები', newMsgs, '/admin/messages'],
    ['აქტიური პარტნიორები', partners, '/admin/partners'],
    ['გამოქვეყნებული პროდუქტები', published, '/admin/products?status=PUBLISHED'],
    ['დრაფტები (განსახილველი)', drafts, '/admin/products?status=DRAFT'],
    ['დამალული (სრული იმპორტიდან)', hidden, '/admin/products?hidden=1'],
    ['ფასის გარეშე', noPrice, '/admin/products?noprice=1'],
    ['EN თარგმანი განსახილველი', enReview, '/admin/translations'],
  ];
  return (
    <>
      <PageHead title="მიმოხილვა" />
      <div className="mb-6 space-y-3">
        {failedEmails > 0 && <Notice tone="error">{failedEmails} ელფოსტა ვერ გაიგზავნა. <Link className="underline" href="/admin/emails">ნახვა</Link></Notice>}
        {!tr.enabled && <Notice tone="warn">Claude-ით თარგმნა გამორთულია — დააყენეთ ANTHROPIC_API_KEY და ANTHROPIC_MODEL (იხ. DEPLOYMENT.md). ხელით თარგმნა მუშაობს.</Notice>}
        {process.env.EMAIL_PROVIDER !== 'resend' && <Notice tone="warn">ელფოსტის პროვაიდერი: console (დეველოპმენტი). რეალური გაგზავნისთვის დააყენეთ EMAIL_PROVIDER=resend.</Notice>}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([label, n, href]) => (
          <Link key={label} href={href} className="rounded-[4px] border border-line bg-paper p-4 hover:border-ink">
            <p className="text-3xl font-extrabold tabular-nums">{n}</p>
            <p className="mt-1 text-sm text-graphite">{label}</p>
          </Link>
        ))}
      </div>
      <Card className="mt-6">
        <h2 className="font-bold">სწრაფი ბმულები</h2>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
          <li><Link className="underline" href="/admin/products/new">+ ახალი პროდუქტი</Link></li>
          <li><Link className="underline" href="/admin/imports">Excel/CSV იმპორტი</Link></li>
          <li><Link className="underline" href="/admin/pages">გვერდების რედაქტორი</Link></li>
          <li><a className="underline" href="/ka" target="_blank" rel="noreferrer">საიტის ნახვა</a></li>
        </ul>
      </Card>
    </>
  );
}
