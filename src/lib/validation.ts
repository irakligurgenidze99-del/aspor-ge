import { z } from 'zod';

const trimmed = (max: number) => z.string().trim().max(max);

// Georgian phone: +995 5XX XXX XXX, or landline; allow spaces/dashes.
export const phoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s\-()]/g, ''))
  .pipe(z.string().regex(/^(\+?995)?\d{9}$/, 'invalid_phone'));

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email('invalid_email'));

// Georgian company identification code: 9 digits (LLC/JSC) or 11 digits (individual entrepreneur personal no.).
export const companyCodeSchema = z.string().trim().regex(/^(\d{9}|\d{11})$/, 'invalid_company_code');

export const applicationSchema = z.object({
  companyName: trimmed(160).min(2, 'required'),
  companyCode: companyCodeSchema,
  contactName: trimmed(120).min(2, 'required'),
  phone: phoneSchema,
  email: emailSchema,
  message: trimmed(2000).optional().or(z.literal('')),
  consent: z.literal('on', { message: 'consent_required' }),
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export const contactSchema = z.object({
  name: trimmed(120).min(2, 'required'),
  email: emailSchema,
  phone: z.union([phoneSchema, z.literal('')]).optional(),
  subject: trimmed(200).optional().or(z.literal('')),
  message: trimmed(5000).min(10, 'too_short'),
  consent: z.literal('on', { message: 'consent_required' }),
});

export const checkoutSchema = z.object({
  slug: z.string().trim().max(120).regex(/^[a-z0-9-]+$/),
  quantity: z.coerce.number().int().min(1, 'qty').max(999, 'qty'),
  method: z.enum(['CARD', 'INSTALLMENT']),
  customerName: trimmed(120).min(2, 'required'),
  phone: phoneSchema,
  email: emailSchema,
  city: trimmed(80).min(2, 'required'),
  address: trimmed(300).min(5, 'required'),
  comment: trimmed(1000).optional().or(z.literal('')),
  consent: z.literal('on', { message: 'consent_required' }),
});
export type CheckoutForm = z.infer<typeof checkoutSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const priceSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(',', '.'))
  .pipe(z.string().regex(/^\d{1,7}(\.\d{1,2})?$/, 'ფასი: მაგ. 24.90'))
  .transform(Number);

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? '_');
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
