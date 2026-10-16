import { requireAdmin } from '@/server/auth/guards';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Badge, Card, PageHead } from '@/components/admin/shell';
import { ActionForm, Submit } from '@/components/admin/forms';
import { TextField } from '@/components/ui/field';
import { createPageAction } from '@/server/actions/admin/content';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'გვერდები' };

export default async function Pages() {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const pages = await db.page.findMany({ orderBy: { createdAt: 'asc' }, include: { translations: true, _count: { select: { sections: { where: { revision: 'DRAFT' } } } } } });
  return (
    <>
      <PageHead title="გვერდები (ვიზუალური რედაქტორი)" desc="სტრუქტურირებული სექციები: დამატება, რიგის შეცვლა, დამალვა, გადახედვა და გამოქვეყნება. თავისუფალი HTML/JS არ დაიშვება." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pages.map((p) => (
          <Link key={p.id} href={`/admin/pages/${p.id}`} className="rounded-[4px] border border-line bg-paper p-4 hover:border-ink">
            <div className="flex items-center justify-between"><h2 className="font-bold">{p.translations.find((t) => t.locale === 'ka')?.title ?? p.key}</h2>{p.hasDraft ? <Badge tone="warn">გამოუქვეყნებელი ცვლილებები</Badge> : p.publishedAt ? <Badge tone="ok">გამოქვეყნებული</Badge> : <Badge>დრაფტი</Badge>}</div>
            <p className="mt-1 text-sm text-mute">/{p.slug} · {p._count.sections} სექცია {p.publishedAt && `· ${formatDate(p.publishedAt)}`}</p>
          </Link>
        ))}
      </div>
      <Card className="mt-6 max-w-lg">
        <h2 className="mb-3 font-bold">+ ახალი გვერდი</h2>
        <ActionForm action={createPageAction} className="space-y-3">
          <TextField label="სათაური (ქართ.)" name="title" required />
          <TextField label="URL slug (ლათინური)" name="slug" hint="მაგ. warranty → /ka/warranty" />
          <Submit size="sm">შექმნა</Submit>
        </ActionForm>
        <p className="mt-3 text-xs text-mute">ახალი გვერდი ხელმისაწვდომი იქნება /ka/&lt;slug&gt; მისამართზე გამოქვეყნების შემდეგ.</p>
      </Card>
    </>
  );
}
