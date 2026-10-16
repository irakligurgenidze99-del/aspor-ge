import 'server-only';
import { hash, verify } from '@node-rs/argon2';

// Argon2id (algorithm 2) with OWASP-recommended parameters.
const OPTS = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(pw: string): Promise<string> {
  return hash(pw, OPTS);
}

export async function verifyPassword(hashStr: string | null | undefined, pw: string): Promise<boolean> {
  if (!hashStr) {
    // Constant-ish work to reduce user-enumeration timing differences.
    await hash(pw, OPTS);
    return false;
  }
  try {
    return await verify(hashStr, pw);
  } catch {
    return false;
  }
}

export function passwordPolicyError(pw: string): string | null {
  if (pw.length < 10) return 'too_short';
  if (pw.length > 200) return 'too_long';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'weak';
  return null;
}
