import { requireAdmin } from '@/server/auth/guards';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Badge, Card, PageHead, td, th } from '@/components/admin/shell';
import { Notice } from '@/components/ui/field';
import { translationConfig } from '@/server/services/translation';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'თარგმანები' };

export default async function Translations() {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const cfg = translationConfig();
  const [products, sections, cats, jobs, missing] = await Promise.all([
    db.productTranslation.findMany({ where: { locale: 'en', status: 'DRAFT_REVIEW' }, include: { product: { select: { id: true, sku: true } } }, take: 200 }),
    db.pageSection.findMany({ where: { revision: 'DRAFT', enStatus: 'DRAFT_REVIEW' }, include: { page: { select: { id: true, key: true } } } }),
    db.categoryTranslation.findMany({ where: { locale: 'en', status: 'DRAFT_REVIEW' }, include: { category: true } }),
    db.translationJob.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
    db.product.count({ where: { translations: { none: { locale: 'en' } } } }),
  ]);
  const tokens = jobs.reduce((a, j) => a + (j.inputTokens ?? 0) + (j.outputTokens ?? 0), 0);
  return (
    <>
      <PageHead title="თარგმანები (EN)" desc="ქართული — მთავარი. ინგლისური ტექსტი, მათ შორის Claude-ით გენერირებული, საჯარო ხდება მხოლოდ ადმინის დამტკიცების შემდეგ." />
      {!cfg.enabled && <div className="mb-4"><Notice tone="warn">Claude-ის თარგმნა გამორთულია: {cfg.hasKey ? 'ANTHROPIC_MODEL' : 'ANTHROPIC_API_KEY / ANTHROPIC_MODEL'} არ არის დაყენებული. ხელით თარგმნა და დამტკიცება მუშაობს.</Notice></div>}
      {cfg.enabled && <p className="mb-4 text-sm text-graphite">მოდელი: <code>{cfg.model}</code> · ბოლო 30 მოთხოვნა: {tokens.toLocaleString()} ტოკენი</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold">განსახილველი პროდუქტები ({products.length})</h2>
          <ul className="space-y-1 text-sm">{products.map((t) => <li key={t.id}><Link className="underline" href={`/admin/products/${t.product.id}`}>{t.product.sku}</Link> — {t.name}</li>)}</ul>
          <p className="mt-3 text-xs text-mute">EN თარგმანის გარეშე: {missing} პროდუქტი</p>
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">გვერდის სექციები ({sections.length}) · კატეგორიები ({cats.length})</h2>
          <ul className="space-y-1 text-sm">
            {sections.map((s) => <li key={s.id}><Link className="underline" href={`/admin/pages/${s.page.id}#s-${s.id}`}>{s.page.key}</Link> — {s.type}</li>)}
            {cats.map((c) => <li key={c.id}><Link className="underline" href="/admin/categories">{c.category.slug}</Link> — {c.name}</li>)}
          </ul>
        </Card>
      </div>
      <Card className="mt-6">
        <h2 className="mb-3 font-bold">Claude-ის მოთხოვნების ჟურნალი</h2>
        <table className="w-full text-sm">
          <thead><tr><th className={th}>დრო</th><th className={th}>ობიექტი</th><th className={th}>მოდელი</th><th className={th}>სტატუსი</th><th className={th}>ტოკენები in/out</th></tr></thead>
          <tbody className="divide-y divide-line">
            {jobs.map((j) => (
              <tr key={j.id}><td className={td}>{formatDate(j.createdAt)}</td><td className={td}>{j.entityType}</td><td className={td}>{j.model}</td><td className={td}><Badge tone={j.status === 'SUCCEEDED' ? 'ok' : 'danger'}>{j.status}</Badge>{j.error && <p className="text-xs text-danger">{j.error}</p>}</td><td className={td}>{j.inputTokens ?? '—'}/{j.outputTokens ?? '—'}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
