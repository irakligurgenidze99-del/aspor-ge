import { requireAdmin } from '@/server/auth/guards';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Badge, PageHead, td, th } from '@/components/admin/shell';
import { formatDate, formatGel } from '@/lib/format';
import { METHOD_KA, ORDER_STATUS_KA, ORDER_TONE } from '@/lib/order-labels';
import { paymentsProvider } from '@/server/payments/config';
import { Notice } from '@/components/ui/field';

export const metadata = { title: 'შეკვეთები' };

const FILTERS = [['', 'აქტიური'], ['PAID', 'გადახდილი'], ['PENDING_PAYMENT', 'მოლოდინში'], ['FULFILLED', 'შესრულებული'], ['ALL', 'ყველა']] as const;

export default async function Orders({ searchParams }: PageProps<'/admin/orders'>) {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const sp = await searchParams;
  const f = typeof sp.status === 'string' ? sp.status : '';
  const where = f === 'ALL' ? {} : f ? { status: f as 'PAID' } : { status: { in: ['PAID' as const, 'PENDING_PAYMENT' as const] } };
  const orders = await db.order.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300, include: { items: { select: { sku: true, quantity: true } } } });
  const provider = paymentsProvider();
  return (
    <>
      <PageHead
        title="შეკვეთები"
        desc="ონლაინ შეკვეთები. გადახდის სტატუსი ავტომატურად ახლდება Bank of Georgia-დან."
        actions={<div className="flex gap-3 text-sm">{FILTERS.map(([k, l]) => <Link key={k} href={k ? `?status=${k}` : '?'} className={f === k ? 'font-bold underline' : 'underline'}>{l}</Link>)}</div>}
      />
      {!provider && <div className="mb-4"><Notice tone="warn">ონლაინ გადახდა გამორთულია: Vercel-ში არ არის BOG_CLIENT_ID / BOG_CLIENT_SECRET. ღილაკი „ყიდვა“ საიტზე არ ჩანს.</Notice></div>}
      {provider === 'mock' && <div className="mb-4"><Notice tone="warn">სატესტო რეჟიმი (mock) — რეალური გადახდა არ ხდება.</Notice></div>}
      <div className="overflow-x-auto rounded-[4px] border border-line bg-paper">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-line bg-studio"><tr><th className={th}>№</th><th className={th}>თარიღი</th><th className={th}>მყიდველი</th><th className={th}>პროდუქტი</th><th className={th}>თანხა</th><th className={th}>გადახდა</th><th className={th}>სტატუსი</th></tr></thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id} className={o.status === 'PAID' ? 'font-semibold' : ''}>
                <td className={td}><Link className="underline" href={`/admin/orders/${o.id}`}>{o.number}</Link></td>
                <td className={td}>{formatDate(o.createdAt)}</td>
                <td className={td}>{o.customerName}{o.companyName && <><br /><span className="font-normal text-mute">{o.companyName}</span></>}</td>
                <td className={td}>{o.items.map((i) => `${i.sku} × ${i.quantity}`).join(', ')}</td>
                <td className={`${td} tabular-nums`}>{formatGel(o.totalGel.toFixed(2))}{o.priceType === 'WHOLESALE' && <span className="ml-1 text-xs font-normal text-mute">საბ.</span>}</td>
                <td className={td}>{METHOD_KA[o.paymentMethod]}</td>
                <td className={td}><Badge tone={ORDER_TONE[o.status]}>{ORDER_STATUS_KA[o.status]}</Badge></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-mute">შეკვეთები არ არის.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
