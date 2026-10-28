import { requireAdmin } from '@/server/auth/guards';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Badge, Card, PageHead } from '@/components/admin/shell';
import { buttonClass } from '@/components/ui/button';
import { formatDate, formatGel } from '@/lib/format';
import { METHOD_KA, ORDER_STATUS_KA, ORDER_TONE } from '@/lib/order-labels';
import { orderNoteAction, orderStatusAction, orderSyncAction } from '@/server/actions/admin/orders';

export default async function OrderDetail({ params }: PageProps<'/admin/orders/[id]'>) {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!o) notFound();
  const statusBtn = (status: string, label: string, variant: 'primary' | 'secondary' | 'danger' = 'secondary') => (
    <form action={orderStatusAction}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value={status} /><button className={buttonClass(variant, 'sm')}>{label}</button></form>
  );
  const row = (k: string, v: React.ReactNode) => <div className="grid grid-cols-[10rem_1fr] gap-3 py-1.5"><dt className="text-mute">{k}</dt><dd>{v}</dd></div>;
  return (
    <>
      <PageHead title={`შეკვეთა ${o.number}`} desc={formatDate(o.createdAt)} actions={<Badge tone={ORDER_TONE[o.status]}>{ORDER_STATUS_KA[o.status]}</Badge>} />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <h2 className="mb-3 font-bold">პროდუქცია</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {o.items.map((i) => (
                <tr key={i.id}><td className="py-2">{i.name}<br /><span className="text-mute">{i.sku}</span></td><td className="py-2 text-right tabular-nums">{formatGel(i.unitGel.toFixed(2))} × {i.quantity}</td><td className="py-2 text-right font-semibold tabular-nums">{formatGel(i.lineGel.toFixed(2))}</td></tr>
              ))}
              <tr><td className="py-2 font-bold" colSpan={2}>ჯამი (მიწოდება უფასო)</td><td className="py-2 text-right font-bold tabular-nums">{formatGel(o.totalGel.toFixed(2))}</td></tr>
            </tbody>
          </table>
          <h2 className="mb-2 mt-8 font-bold">მყიდველი და მიწოდება</h2>
          {/* Rendered as text (React escapes) — never as HTML. */}
          <dl className="text-sm">
            {row('სახელი', o.customerName)}
            {o.companyName && row('კომპანია', `${o.companyName} (${o.companyCode ?? '—'})`)}
            {row('ტელეფონი', <a className="underline" href={`tel:${o.phone}`}>{o.phone}</a>)}
            {row('ელფოსტა', <a className="underline" href={`mailto:${o.email}`}>{o.email}</a>)}
            {row('მისამართი', `${o.city}, ${o.address}`)}
            {o.comment && row('კომენტარი', <span className="whitespace-pre-line">{o.comment}</span>)}
            {row('ენა', o.locale)}
          </dl>
        </Card>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-2 font-bold">გადახდა</h2>
            <dl className="text-sm">
              {row('მეთოდი', `${METHOD_KA[o.paymentMethod]}${o.loanMonths ? ` · ${o.loanMonths} თვე` : ''}`)}
              {row('ფასი', o.priceType === 'WHOLESALE' ? 'საბითუმო (პარტნიორი)' : 'საცალო')}
              {row('პროვაიდერი', o.provider === 'mock' ? 'სატესტო (mock)' : 'Bank of Georgia')}
              {row('BOG შეკვეთის ID', <code className="text-xs">{o.providerOrderId ?? '—'}</code>)}
              {row('BOG სტატუსი', `${o.providerStatus ?? '—'}${o.providerMethod ? ` (${o.providerMethod})` : ''}`)}
              {row('გადახდის დრო', o.paidAt ? formatDate(o.paidAt) : '—')}
              {row('წესების ვერსია', o.termsVersion)}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {o.provider === 'bog' && o.providerOrderId && <form action={orderSyncAction}><input type="hidden" name="id" value={o.id} /><button className={buttonClass('secondary', 'sm')}>BOG-დან განახლება</button></form>}
              {o.status === 'PAID' && statusBtn('FULFILLED', 'შესრულებულად მონიშვნა', 'primary')}
              {o.status === 'FULFILLED' && statusBtn('PAID', 'შესრულების გაუქმება')}
              {['PENDING_PAYMENT', 'FAILED', 'PAID'].includes(o.status) && statusBtn('CANCELLED', 'გაუქმება', 'danger')}
            </div>
            <p className="mt-3 text-xs text-mute">თანხის დაბრუნება ხდება BOG-ის ბიზნეს პანელში; შემდეგ დააჭირეთ „BOG-დან განახლება“.</p>
          </Card>
          <Card>
            <h2 className="mb-2 font-bold">შიდა შენიშვნა</h2>
            <form action={orderNoteAction} className="space-y-2">
              <input type="hidden" name="id" value={o.id} />
              <textarea name="note" rows={4} defaultValue={o.adminNote ?? ''} aria-label="შიდა შენიშვნა" className="block w-full rounded-[3px] border border-line p-2 text-sm" />
              <button className={buttonClass('secondary', 'sm')}>შენახვა</button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
