import 'server-only';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { db } from '@/lib/db';
import { escapeCell } from '@/lib/import/core';

export const EXPORT_COLUMNS = ['sku', 'category', 'name_ka', 'description_ka', 'name_en', 'description_en', 'wholesale_price_gel_vat_included', 'retail_price_gel_vat_included', 'status', 'color', 'model_number', 'images', 'specifications', 'featured', 'sort_order'] as const;

export async function exportRows() {
  const products = await db.product.findMany({
    orderBy: { sku: 'asc' },
    include: { category: true, translations: true, price: true, attributes: { orderBy: { sortOrder: 'asc' } }, images: { orderBy: { sortOrder: 'asc' }, include: { asset: true } } },
  });
  return products.map((p) => {
    const ka = p.translations.find((t) => t.locale === 'ka');
    const en = p.translations.find((t) => t.locale === 'en');
    return {
      sku: p.sku, category: p.category.slug, name_ka: ka?.name ?? '', description_ka: ka?.description ?? '', name_en: en?.name ?? '', description_en: en?.description ?? '',
      wholesale_price_gel_vat_included: p.price ? p.price.amountGel.toFixed(2) : '', retail_price_gel_vat_included: p.retailPrice ? p.retailPrice.toFixed(2) : '', status: p.isHidden ? 'draft' : p.status.toLowerCase(), color: p.color ?? '', model_number: p.modelNumber ?? '',
      images: p.images.map((i) => i.asset.sourceRef ?? `media:${i.asset.id}`).join(' | '), specifications: p.attributes.map((a) => `${a.labelKa}: ${a.value}`).join('\n'),
      featured: p.featured ? 'yes' : 'no', sort_order: String(p.sortOrder),
    };
  });
}

export async function toXlsx(rows: Record<string, string>[], cols: readonly string[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('products');
  ws.addRow([...cols]);
  ws.getRow(1).font = { bold: true };
  for (const r of rows) ws.addRow(cols.map((c) => escapeCell(r[c])));
  ws.columns.forEach((c) => (c.width = 22));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function toCsv(rows: Record<string, string>[], cols: readonly string[]) {
  return '﻿' + Papa.unparse({ fields: [...cols], data: rows.map((r) => cols.map((c) => escapeCell(r[c]))) });
}

export const TEMPLATE_ROWS: Record<string, string>[] = [
  {
    sku: 'DEMO-A313-BLACK', category: 'power-banks', name_ka: 'DEMO პაუერბანკი 10000mAh (შავი)', description_ka: 'სადემონსტრაციო ჩანაწერი — შეცვალეთ რეალური მონაცემებით.', name_en: '', description_en: '',
    wholesale_price_gel_vat_included: '0.00', retail_price_gel_vat_included: '0.00', status: 'draft', color: 'შავი', model_number: 'A313', images: 'https://example.com/demo-image.jpg',
    specifications: 'ტევადობა: 10000mAh/37Wh\nUSB-C შესასვლელი: 5V-3A/9V-2A', featured: 'no', sort_order: '0',
  },
];
