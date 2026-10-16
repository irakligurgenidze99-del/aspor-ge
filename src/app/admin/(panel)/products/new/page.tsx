import { requireAdmin } from '@/server/auth/guards';
import { db } from '@/lib/db';
import { Card, PageHead } from '@/components/admin/shell';
import { ProductForm } from '@/components/admin/product-form';

export default async function NewProduct() {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const cats = await db.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { translations: { where: { locale: 'ka' } } } });
  return (
    <>
      <PageHead title="ახალი პროდუქტი" desc="იქმნება დრაფტად. გამოქვეყნება — შემდეგ ეტაპზე, განხილვის შემდეგ." />
      <Card className="max-w-3xl">
        <ProductForm cats={cats.map((c) => ({ id: c.id, name: c.translations[0]?.name ?? c.slug }))} p={{ sku: '', slug: '', categoryId: '', nameKa: '', descriptionKa: '', seoTitleKa: '', seoDescKa: '', color: '', modelNumber: '', featured: false, sortOrder: 0, price: '', specs: '' }} />
      </Card>
    </>
  );
}
