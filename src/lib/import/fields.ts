// Canonical import fields. The admin maps spreadsheet columns onto these in the UI;
// auto-suggestion uses the aliases below (case/space-insensitive).

export const IMPORT_FIELDS = [
  { key: 'sku', label: 'SKU (უნიკალური კოდი)', required: true, aliases: ['sku', 'კოდი', 'article', 'artikul', 'item code'] },
  { key: 'category', label: 'კატეგორია (slug ან სახელი)', required: true, aliases: ['category', 'კატეგორია', 'category_slug'] },
  { key: 'category_name_ka', label: 'კატეგორიის სახელი (ქართ.) — ახლისთვის', required: false, aliases: ['category_name_ka'] },
  { key: 'category_name_en', label: 'კატეგორიის სახელი (ინგლ.)', required: false, aliases: ['category_name_en'] },
  { key: 'name_ka', label: 'დასახელება (ქართ.)', required: true, aliases: ['name_ka', 'დასახელება', 'სახელი', 'name'] },
  { key: 'description_ka', label: 'აღწერა (ქართ.)', required: false, aliases: ['description_ka', 'აღწერა', 'description'] },
  { key: 'name_en', label: 'Name (EN) — საჭიროებს დამტკიცებას', required: false, aliases: ['name_en'] },
  { key: 'description_en', label: 'Description (EN) — საჭიროებს დამტკიცებას', required: false, aliases: ['description_en'] },
  { key: 'wholesale_price_gel_vat_included', label: 'საბითუმო ფასი ₾ (დღგ-ს ჩათვლით)', required: false, aliases: ['wholesale_price_gel_vat_included', 'wholesale_price', 'b2b', 'b2b price', 'საბითუმო ფასი', 'ფასი'] },
  { key: 'status', label: 'სტატუსი (draft / published)', required: false, aliases: ['status', 'publication', 'სტატუსი', 'publish'] },
  { key: 'color', label: 'ფერი', required: false, aliases: ['color', 'colour', 'ფერი'] },
  { key: 'model_number', label: 'მოდელის ნომერი', required: false, aliases: ['model_number', 'model', 'model no', 'model no.', 'მოდელი'] },
  { key: 'images', label: 'სურათები (https URL, გამყოფი |)', required: false, aliases: ['images', 'image', 'image_urls', 'სურათი', 'სურათები'] },
  { key: 'specifications', label: 'სპეციფიკაციები („გასაღები: მნიშვნელობა“ ყოველ ხაზზე)', required: false, aliases: ['specifications', 'specs', 'სპეციფიკაცია', 'მახასიათებლები'] },
  { key: 'featured', label: 'გამორჩეული (yes/no)', required: false, aliases: ['featured', 'გამორჩეული'] },
  { key: 'sort_order', label: 'რიგითობა', required: false, aliases: ['sort_order', 'order'] },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]['key'];
export type Mapping = { fields: Partial<Record<ImportFieldKey, string>>; specColumns: string[] };

const norm = (s: string) => s.toLowerCase().replace(/[\s_.\-]+/g, ' ').trim();

export function suggestMapping(headers: string[]): Mapping {
  const fields: Mapping['fields'] = {};
  const used = new Set<string>();
  for (const f of IMPORT_FIELDS) {
    const hit = headers.find((h) => !used.has(h) && f.aliases.some((a) => norm(a) === norm(h)));
    if (hit) {
      fields[f.key] = hit;
      used.add(hit);
    }
  }
  const specColumns = headers.filter((h) => !used.has(h) && /^spec[:_ ]/i.test(h));
  return { fields, specColumns };
}
