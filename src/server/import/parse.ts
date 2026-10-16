import 'server-only';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { LIMITS, type RawRow } from '@/lib/import/core';

export class ParseError extends Error {}

export type Parsed = { headers: string[]; rows: RawRow[]; sheetName?: string; headerRow: number };

function cellToString(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if ('result' in v) return cellToString((v as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue); // never evaluate formulas, use cached result
    if ('richText' in v) return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join('');
    if ('text' in v) return String((v as ExcelJS.CellHyperlinkValue).text);
    if ('error' in v) return '';
  }
  return '';
}

function finalize(matrix: string[][]): Parsed {
  // Header = first row with ≥2 non-empty cells.
  const hIdx = matrix.findIndex((r) => r.filter((c) => c.trim()).length >= 2);
  if (hIdx < 0) throw new ParseError('no_header_row');
  const headers = matrix[hIdx].map((h, i) => h.replace(/\s+/g, ' ').trim() || `column_${i + 1}`);
  if (headers.length > LIMITS.maxCols) throw new ParseError('too_many_columns');
  const dupe = headers.find((h, i) => headers.indexOf(h) !== i);
  if (dupe) throw new ParseError(`duplicate_header:${dupe}`);
  const rows: RawRow[] = [];
  for (const r of matrix.slice(hIdx + 1)) {
    if (!r.some((c) => c.trim())) continue;
    const o: RawRow = {};
    headers.forEach((h, i) => (o[h] = (r[i] ?? '').toString()));
    rows.push(o);
    if (rows.length > LIMITS.maxRows) throw new ParseError('too_many_rows');
  }
  return { headers, rows, headerRow: hIdx + 1 };
}

export async function parseSpreadsheet(buf: Buffer, fileName: string): Promise<Parsed> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv')) {
    const text = buf.toString('utf8').replace(/^﻿/, '');
    const res = Papa.parse<string[]>(text, { skipEmptyLines: false });
    if (res.errors.length && !res.data.length) throw new ParseError('csv_parse_error');
    return finalize(res.data.map((r) => r.map((c) => (c ?? '').toString())));
  }
  if (lower.endsWith('.xlsx')) {
    // ZIP signature check before handing to the parser.
    if (buf.length < 4 || buf.readUInt32LE(0) !== 0x04034b50) throw new ParseError('not_xlsx');
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(buf as unknown as ArrayBuffer);
    } catch {
      throw new ParseError('xlsx_parse_error');
    }
    const ws = wb.worksheets[0];
    if (!ws) throw new ParseError('empty_workbook');
    if (ws.rowCount > LIMITS.maxRows + 20) throw new ParseError('too_many_rows');
    const matrix: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (row, n) => {
      const vals: string[] = [];
      const width = Math.min(row.cellCount, LIMITS.maxCols + 1);
      for (let c = 1; c <= width; c++) vals.push(cellToString(row.getCell(c).value));
      matrix[n - 1] = vals;
    });
    for (let i = 0; i < matrix.length; i++) matrix[i] ??= [];
    return { ...finalize(matrix), sheetName: ws.name };
  }
  throw new ParseError('unsupported_file_type');
}
