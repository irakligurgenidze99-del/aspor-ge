import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { db } from '@/lib/db';

/**
 * Claude translation adapter (Georgian → English). Server-only; the key never
 * reaches the browser. Called ONLY from explicit admin actions. Output is stored
 * as DRAFT_REVIEW and is never public until an admin approves it.
 */
export function translationConfig() {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  return { enabled: !!key && !!model, hasKey: !!key, model: model ?? null };
}

export class TranslationError extends Error {
  constructor(public code: 'not_configured' | 'rate_limited' | 'provider_error' | 'invalid_output', message?: string) {
    super(message ?? code);
  }
}

const SYSTEM = `You translate Georgian e-commerce/B2B catalog content for ASPOR, a mobile-accessories brand, into natural, concise British/International English.
Rules:
- Translate only the provided strings. Return every id exactly once.
- Preserve verbatim: SKUs, model numbers, brand names (ASPOR, Apple, iPhone, Lightning, USB-C, MagSafe, Qi, GaN, PD, QC), units and numbers (mAh, W, V, A, Wh, cm, kg, m), and technical spec values.
- Keep HTML tags exactly as given if a string contains HTML; translate only the text nodes.
- Do not add claims, marketing superlatives or information not present in the source.
- If a string is already English or purely technical, return it unchanged.`;

const outSchema = z.object({ items: z.array(z.object({ id: z.string(), en: z.string().max(60000) })) });

export async function translateStrings(items: { id: string; ka: string }[], ctx: { entityType: string; entityId: string; adminId: string }) {
  const cfg = translationConfig();
  if (!cfg.enabled) throw new TranslationError('not_configured');
  if (items.length === 0) return new Map<string, string>();
  if (items.length > 80) throw new TranslationError('invalid_output', 'too many strings in one request');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 60_000 });
  try {
    const msg = await client.messages.create({
      model: cfg.model!,
      max_tokens: 8000,
      system: SYSTEM,
      tools: [
        {
          name: 'submit_translations',
          description: 'Return the English translations.',
          input_schema: {
            type: 'object',
            properties: { items: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, en: { type: 'string' } }, required: ['id', 'en'] } } },
            required: ['items'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_translations' },
      messages: [{ role: 'user', content: `Translate these Georgian strings to English:\n${JSON.stringify(items)}` }],
    });
    const block = msg.content.find((b) => b.type === 'tool_use');
    const parsed = outSchema.safeParse(block && 'input' in block ? block.input : null);
    if (!parsed.success) throw new TranslationError('invalid_output');
    const map = new Map(parsed.data.items.filter((i) => items.some((x) => x.id === i.id)).map((i) => [i.id, i.en]));
    if (map.size !== items.length) throw new TranslationError('invalid_output', 'missing ids in model output');
    await db.translationJob.create({
      data: { ...pick(ctx), model: cfg.model!, status: 'SUCCEEDED', inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens, createdById: ctx.adminId },
    });
    return map;
  } catch (e) {
    const code = e instanceof TranslationError ? e.code : e instanceof Anthropic.RateLimitError ? 'rate_limited' : 'provider_error';
    const message = (e as Error).message?.slice(0, 500);
    await db.translationJob.create({ data: { ...pick(ctx), model: cfg.model ?? 'unset', status: 'FAILED', error: `${code}: ${message}`, createdById: ctx.adminId } });
    throw e instanceof TranslationError ? e : new TranslationError(code, message);
  }
}

const pick = (c: { entityType: string; entityId: string }) => ({ entityType: c.entityType, entityId: c.entityId });
