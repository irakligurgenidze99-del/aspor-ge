'use client';
import { ActionForm, Submit } from './forms';
import { saveProductAction, saveEnglishProductAction, translateProductAction, uploadProductImagesAction } from '@/server/actions/admin/catalog';
import { TextArea, TextField, SelectField, Checkbox } from '../ui/field';

type Cat = { id: string; name: string };
export type ProductFormData = {
  id?: string; sku: string; slug: string; categoryId: string; nameKa: string; descriptionKa: string; seoTitleKa: string; seoDescKa: string;
  color: string; modelNumber: string; featured: boolean; sortOrder: number; price: string; retailPrice: string; specs: string;
};

export function ProductForm({ p, cats }: { p: ProductFormData; cats: Cat[] }) {
  return (
    <ActionForm action={saveProductAction} className="space-y-5">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="SKU" name="sku" required defaultValue={p.sku} hint="უნიკალური, სტაბილური გასაღები (იმპორტიც ამით ემთხვევა)" />
        <SelectField label="კატეგორია" name="categoryId" required defaultValue={p.categoryId}>
          <option value="">— აირჩიეთ —</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
      </div>
      <TextField label="დასახელება (ქართ.)" name="nameKa" required defaultValue={p.nameKa} />
      <TextArea label="მოკლე აღწერა (ქართ.)" name="descriptionKa" rows={4} defaultValue={p.descriptionKa} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="ფერი" name="color" defaultValue={p.color} />
        <TextField label="მოდელის ნომერი" name="modelNumber" defaultValue={p.modelNumber} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="საცალო ფასი ₾ (დღგ-ს ჩათვლით)" name="retailPrice" inputMode="decimal" defaultValue={p.retailPrice} hint="ჩანს ყველას. ცარიელი = ონლაინ არ იყიდება." />
        <TextField label="საბითუმო ფასი ₾ (დღგ-ს ჩათვლით)" name="price" inputMode="decimal" defaultValue={p.price} hint="ცარიელი = ფასი არ არის. ჩანს მხოლოდ აქტიურ პარტნიორებს." />
      </div>
      <TextArea label="ტექნიკური მახასიათებლები" name="specs" rows={8} defaultValue={p.specs} hint="ყოველ ხაზზე: დასახელება: მნიშვნელობა (მაგ. ტევადობა: 10000mAh)" className="font-mono" />
      <details className="rounded-[3px] border border-line p-4">
        <summary className="cursor-pointer text-sm font-semibold">SEO და URL</summary>
        <div className="mt-4 space-y-4">
          <TextField label="URL slug (ლათინური)" name="slug" defaultValue={p.slug} hint="ცარიელი → ავტომატურად SKU-დან და სახელიდან" />
          <TextField label="SEO სათაური (ქართ.)" name="seoTitleKa" defaultValue={p.seoTitleKa} />
          <TextArea label="SEO აღწერა (ქართ.)" name="seoDescKa" rows={2} defaultValue={p.seoDescKa} />
        </div>
      </details>
      <div className="flex flex-wrap items-center gap-6">
        <Checkbox name="featured" label="გამორჩეული (მთავარ გვერდზე)" defaultChecked={p.featured} />
        <TextField label="რიგითობა" name="sortOrder" type="number" defaultValue={String(p.sortOrder)} className="w-32" />
      </div>
      <Submit>შენახვა</Submit>
    </ActionForm>
  );
}

export function ImageUpload({ productId }: { productId: string }) {
  return (
    <ActionForm action={uploadProductImagesAction} className="space-y-3" okText="სურათები აიტვირთა." resetOnOk>
      <input type="hidden" name="productId" value={productId} />
      <label className="block text-sm font-semibold" htmlFor="files">სურათების ატვირთვა (JPG/PNG/WebP/AVIF, ≤4MB, თეთრ ფონზე)</label>
      <input id="files" name="files" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="block w-full text-sm" />
      <Submit size="sm" variant="secondary">ატვირთვა</Submit>
    </ActionForm>
  );
}

export type EnData = { nameKa: string; descriptionKa: string; seoTitleKa: string; seoDescKa: string; name: string; description: string; seoTitle: string; seoDesc: string; status: string; source: string; attrs: { id: string; labelKa: string; value: string; labelEn: string; valueEn: string }[] };

export function EnglishPanel({ id, en, enabled }: { id: string; en: EnData; enabled: boolean }) {
  const row = (label: string, ka: string, name: string, value: string, area = false) => (
    <div className="grid gap-2 md:grid-cols-2">
      <div><p className="mb-1 text-xs font-semibold text-mute">{label} — ქართ.</p><p className="min-h-10 whitespace-pre-line rounded-[3px] bg-studio p-2.5 text-sm">{ka || '—'}</p></div>
      {area ? <TextArea label={`${label} — EN`} name={name} defaultValue={value} rows={4} /> : <TextField label={`${label} — EN`} name={name} defaultValue={value} />}
    </div>
  );
  return (
    <div className="space-y-4">
      <ActionForm action={translateProductAction} okText="თარგმანი შეიქმნა — განიხილეთ და დაამტკიცეთ.">
        <input type="hidden" name="id" value={id} />
        <div className="flex flex-wrap items-center gap-3">
          <Submit variant="secondary" size="sm">{enabled ? 'Claude-ით თარგმნა (ka → en)' : 'Claude-ით თარგმნა — გამორთულია'}</Submit>
          <span className="text-xs text-mute">{enabled ? 'გაიგზავნება მხოლოდ ტექსტური ველები. შედეგი არ გამოქვეყნდება დამტკიცებამდე.' : 'API გასაღები/მოდელი არ არის დაყენებული. შეგიძლიათ თარგმნოთ ხელით.'}</span>
        </div>
      </ActionForm>
      <ActionForm action={saveEnglishProductAction} className="space-y-4">
        <input type="hidden" name="id" value={id} />
        <p className="text-sm">სტატუსი: <strong>{en.status || 'NONE'}</strong>{en.source && <span className="text-mute"> · წყარო: {en.source}</span>}</p>
        {row('დასახელება', en.nameKa, 'nameEn', en.name)}
        {row('აღწერა', en.descriptionKa, 'descriptionEn', en.description, true)}
        {row('SEO სათაური', en.seoTitleKa, 'seoTitleEn', en.seoTitle)}
        {row('SEO აღწერა', en.seoDescKa, 'seoDescEn', en.seoDesc)}
        {en.attrs.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">მახასიათებლები (EN)</p>
            {en.attrs.map((a) => (
              <div key={a.id} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr]">
                <p className="rounded-[3px] bg-studio p-2 text-sm">{a.labelKa}: {a.value}</p>
                <input aria-label={`${a.labelKa} label EN`} name={`attr:label:${a.id}`} defaultValue={a.labelEn} placeholder="Label (EN)" className="h-10 rounded-[3px] border border-line px-2 text-sm" />
                <input aria-label={`${a.labelKa} value EN`} name={`attr:value:${a.id}`} defaultValue={a.valueEn} placeholder="Value (EN) — ცარიელი = იგივე" className="h-10 rounded-[3px] border border-line px-2 text-sm" />
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Submit variant="secondary" name="intent" value="save">დრაფტად შენახვა</Submit>
          <Submit name="intent" value="approve">დამტკიცება და გამოქვეყნება (EN)</Submit>
          <Submit variant="ghost" name="intent" value="reject">უარყოფა</Submit>
        </div>
      </ActionForm>
    </div>
  );
}
