import { createHash, timingSafeEqual } from 'node:crypto';
import redis from '@kuraykaraaslan/redis';
import { env } from '@kuraykaraaslan/env';
import { encryptFieldOpt, decryptFieldOpt, isEncryptedField } from '@kuraykaraaslan/common/server/field-encryption';
import { UserSecurity } from './user_security.types';

export const USER_SECURITY_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);

/** One-way hash for backup codes / device tokens — never store the raw value. */
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** Constant-time compare of two hex digests of equal length. */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try { return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex')); } catch { return false; }
}

/** Decrypt the TOTP secret for return; the DB / cache only ever hold ciphertext. */
export function hydrate(parsed: UserSecurity): UserSecurity {
  if (parsed.otpSecret) parsed.otpSecret = decryptFieldOpt(parsed.otpSecret) ?? null;
  return parsed;
}

/** Encrypt the TOTP secret before it ever touches the DB (skip if already ciphertext). */
export function encryptWrite<T extends Partial<UserSecurity>>(data: T): T {
  if (typeof data.otpSecret === 'string' && data.otpSecret && !isEncryptedField(data.otpSecret)) {
    return { ...data, otpSecret: encryptFieldOpt(data.otpSecret) };
  }
  return data;
}

export async function clearCache(userId: string): Promise<void> {
  await Promise.all([
    redis.del(`user_security:user:${userId}`).catch(() => {}),
    redis.del(`user_security:safe:${userId}`).catch(() => {}),
  ]);
}
