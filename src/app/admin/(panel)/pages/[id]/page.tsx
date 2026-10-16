import { requireAdmin } from '@/server/auth/guards';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Badge, Card, PageHead } from '@/components/admin/shell';
import { ActionForm, ConfirmSubmit, Submit } from '@/components/admin/forms';
import { SectionEditor } from '@/components/admin/section-editor';
import { TextArea, TextField } from '@/components/ui/field';
import { SECTION_FIELDS, SECTION_TYPES, isSectionType, parseSection } from '@/lib/page-builder/registry';
import { addSectionAction, discardDraftAction, publishPageAction, savePageMetaAction, sectionOpAction, translateSectionAction } from '@/server/actions/admin/content';
import { translationConfig } from '@/server/services/translation';
import { buttonClass } from '@/components/ui/button';

export default async function PageEditor({ params }: PageProps<'/admin/pages/[id]'>) {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const { id } = await params;
  const page = await db.page.findUnique({ where: { id }, include: { translations: true, sections: { where: { revision: 'DRAFT' }, orderBy: { sortOrder: 'asc' } } } });
  if (!page) notFound();
  const media = (await db.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 300 })).map((m) => ({ id: m.id, url: m.url, name: m.originalName ?? m.id }));
  const ka = page.translations.find((t) => t.locale === 'ka');
  const en = page.translations.find((t) => t.locale === 'en');
  const tr = translationConfig();
  const path = page.slug ? `/${page.slug}` : '';
  return (
    <>
      <PageHead
        title={ka?.title ?? page.key}
        desc={<span className="flex flex-wrap items-center gap-2">/{page.slug} {page.hasDraft ? <Badge tone="warn">გამოუქვეყნებელი ცვლილებები</Badge> : <Badge tone="ok">დრაფტი = გამოქვეყნებული</Badge>}</span>}
        actions={
          <>
            <a href={`/admin/preview/${page.id}?locale=ka`} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'sm')}>გადახედვა (ka)</a>
            <a href={`/admin/preview/${page.id}?locale=en`} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'sm')}>გადახედვა (en)</a>
            {page.publishedAt && <a href={`/ka${path}`} target="_blank" rel="noreferrer" className={buttonClass('ghost', 'sm')}>საჯარო</a>}
            <form action={discardDraftAction}><input type="hidden" name="pageId" value={page.id} /><ConfirmSubmit label="დრაფტის გაუქმება" title="ცვლილებების გაუქმება" body="დრაფტი დაბრუნდება ბოლო გამოქვეყნებულ ვერსიაზე." confirmLabel="გაუქმება" /></form>
            <form action={publishPageAction}><input type="hidden" name="pageId" value={page.id} /><ConfirmSubmit variant="primary" label="გამოქვეყნება" title="გვერდის გამოქვეყნება" body="დრაფტის ყველა სექცია (დამალულის გარდა) გახდება საჯარო. EN ტექსტი ჩანს მხოლოდ დამტკიცებულ სექციებში." confirmLabel="გამოქვეყნება" /></form>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {page.sections.length === 0 && <Card><p className="text-sm text-mute">სექციები არ არის — დაამატეთ მარჯვნიდან.</p></Card>}
          {page.sections.map((s, i) => {
            const parsed = parseSection(s.type, s.data);
            return (
              <Card key={s.id} className={s.hidden ? 'opacity-60' : ''}>
                <div id={`s-${s.id}`} className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold">{i + 1}. {isSectionType(s.type) ? SECTION_FIELDS[s.type].label : s.type}</h2>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {s.hidden && <Badge>დამალული</Badge>}
                    <Badge tone={s.enStatus === 'APPROVED' ? 'ok' : s.enStatus === 'NONE' ? 'neutral' : s.enStatus === 'REJECTED' ? 'danger' : 'warn'}>EN {s.enStatus}</Badge>
                    {(['up', 'down', 'toggle'] as const).map((op) => (
                      <form key={op} action={sectionOpAction}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="op" value={op} />
                        <button aria-label={{ up: 'ზემოთ', down: 'ქვემოთ', toggle: s.hidden ? 'გამოჩენა' : 'დამალვა' }[op]} disabled={(op === 'up' && i === 0) || (op === 'down' && i === page.sections.length - 1)} className="h-8 rounded-[3px] border border-line px-2 text-xs font-semibold disabled:opacity-30">{{ up: '↑', down: '↓', toggle: s.hidden ? 'გამოჩენა' : 'დამალვა' }[op]}</button>
                      </form>
                    ))}
                    <form action={sectionOpAction}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="op" value="delete" /><ConfirmSubmit label="წაშლა" title="სექციის წაშლა" body="სექცია წაიშლება დრაფტიდან." confirmLabel="წაშლა" /></form>
                  </div>
                </div>
                {parsed.success && isSectionType(s.type) ? <SectionEditor id={s.id} type={s.type} initial={parsed.data as Record<string, unknown>} media={media} /> : <p className="text-sm text-danger">არასწორი სექცია: {parsed.success ? s.type : parsed.error}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-xs">
                  {tr.enabled && <form action={translateSectionAction}><input type="hidden" name="id" value={s.id} /><button className="font-semibold underline">Claude-ით EN თარგმნა</button></form>}
                  {s.enStatus === 'DRAFT_REVIEW' && (
                    <>
                      <form action={sectionOpAction}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="op" value="approveEn" /><button className="font-semibold text-ok underline">EN დამტკიცება</button></form>
                      <form action={sectionOpAction}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="op" value="rejectEn" /><button className="font-semibold text-danger underline">EN უარყოფა</button></form>
                    </>
                  )}
                  <span className="text-mute">EN ტექსტის რედაქტირება ავტომატურად აბრუნებს სტატუსს განხილვაზე.</span>
                </div>
              </Card>
            );
          })}
        </div>
        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card>
            <h2 className="mb-3 font-bold">+ სექციის დამატება</h2>
            <form action={addSectionAction} className="space-y-2">
              <input type="hidden" name="pageId" value={page.id} />
              <select name="type" aria-label="სექციის ტიპი" className="h-10 w-full rounded-[3px] border border-line px-2 text-sm">{SECTION_TYPES.map((t) => <option key={t} value={t}>{SECTION_FIELDS[t].label}</option>)}</select>
              <button className={buttonClass('secondary', 'sm')}>დამატება</button>
            </form>
          </Card>
          <Card>
            <h2 className="mb-3 font-bold">სათაური და SEO</h2>
            <ActionForm action={savePageMetaAction} className="space-y-3">
              <input type="hidden" name="pageId" value={page.id} />
              <TextField label="სათაური (ქართ.)" name="titleKa" defaultValue={ka?.title} required />
              <TextField label="SEO title (ქართ.)" name="seoTitleKa" defaultValue={ka?.seoTitle ?? ''} />
              <TextArea label="SEO description (ქართ.)" name="seoDescKa" defaultValue={ka?.seoDesc ?? ''} rows={2} />
              <TextField label="Title (EN)" name="titleEn" defaultValue={en?.title ?? ''} />
              <TextField label="SEO title (EN)" name="seoTitleEn" defaultValue={en?.seoTitle ?? ''} />
              <TextArea label="SEO description (EN)" name="seoDescEn" defaultValue={en?.seoDesc ?? ''} rows={2} />
              <p className="text-xs text-mute">EN სტატუსი: {en?.status ?? 'NONE'} — EN გვერდი ინდექსირდება მხოლოდ დამტკიცების შემდეგ.</p>
              <div className="flex gap-2"><Submit size="sm" variant="secondary" name="enIntent" value="save">შენახვა</Submit><Submit size="sm" name="enIntent" value="approve">+ EN დამტკიცება</Submit></div>
            </ActionForm>
          </Card>
          <p className="text-xs text-mute"><Link className="underline" href="/admin/pages">← ყველა გვერდი</Link></p>
        </div>
      </div>
    </>
  );
}
