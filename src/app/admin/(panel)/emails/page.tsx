import { requireAdmin } from '@/server/auth/guards';
import { db } from '@/lib/db';
import { Badge, PageHead, td, th } from '@/components/admin/shell';
import { processOutboxAction, retryEmailAction } from '@/server/actions/admin/b2b';
import { formatDate } from '@/lib/format';
import { buttonClass } from '@/components/ui/button';

export const metadata = { title: 'ელფოსტის ჟურნალი' };

export default async function Emails() {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const logs = await db.emailLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, to: true, template: true, subject: true, status: true, attempts: true, lastError: true, createdAt: true, sentAt: true } });
  return (
    <>
      <PageHead title="ელფოსტის ჟურნალი (outbox)" desc={`პროვაიდერი: ${process.env.EMAIL_PROVIDER ?? 'console'}. წარუმატებელი გაგზავნები მეორდება ავტომატურად (Vercel Cron → /api/cron/emails) ექსპონენციალური დაყოვნებით, მაქს. 5-ჯერ. ერთჯერადი ბმულების ტექსტი იშლება გაგზავნის შემდეგ.`} actions={<form action={processOutboxAction}><button className={buttonClass('secondary', 'sm')}>რიგის დამუშავება ახლა</button></form>} />
      <div className="overflow-x-auto rounded-[4px] border border-line bg-paper">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-line bg-studio"><tr><th className={th}>დრო</th><th className={th}>მიმღები</th><th className={th}>შაბლონი</th><th className={th}>თემა</th><th className={th}>სტატუსი</th><th className={th}></th></tr></thead>
          <tbody className="divide-y divide-line">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className={td}>{formatDate(l.createdAt)}</td>
                <td className={td}>{l.to}</td>
                <td className={td}>{l.template}</td>
                <td className={td}>{l.subject}</td>
                <td className={td}><Badge tone={l.status === 'SENT' ? 'ok' : l.status === 'FAILED' ? 'danger' : 'warn'}>{l.status} ×{l.attempts}</Badge>{l.lastError && <p className="mt-1 max-w-64 text-xs text-danger">{l.lastError}</p>}</td>
                <td className={td}>{l.status !== 'SENT' && <form action={retryEmailAction}><input type="hidden" name="id" value={l.id} /><button className="text-xs font-semibold underline">ხელახლა</button></form>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
