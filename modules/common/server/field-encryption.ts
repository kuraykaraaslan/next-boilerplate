import { createCipheriv, createDecipheriv, randomBytes, type CipherGCM, type DecipherGCM } from 'node:crypto';
import { env } from '@nb/env';

/**
 * AES-256-GCM field-level encryption for sensitive DB columns (TOTP secrets,
 * OAuth tokens, etc.).  Wire format: `v1.{iv}.{ciphertext}.{authTag}` (all
 * base64url, joined by `.`).  Uses the same SETTINGS_ENCRYPTION_KEY that the
 * e_signature module uses for provider API keys — one key, one algorithm, one
 * rotation surface.
 *
 * Both encrypt/decrypt are synchronous.  encryptOpt / decryptOpt are safe to
 * call when the env var is absent — they return the plaintext unchanged so the
 * system stays functional until the operator configures the key.
 */
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const VERSION = 'v1';
const PREFIX = `${VERSION}.`;

function loadKey(): Buffer {
  const raw = env.SETTINGS_ENCRYPTION_KEY;
  if (!raw || !/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error('SETTINGS_ENCRYPTION_KEY must be set to 64 hex chars (32 bytes) for field encryption');
  }
  return Buffer.from(raw, 'hex');
}

export function isEncryptedField(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encryptField(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv) as CipherGCM;
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), ciphertext.toString('base64url'), tag.toString('base64url')].join('.');
}

export function decryptField(encoded: string): string {
  const parts = encoded.split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) throw new Error('Invalid encrypted field format');
  const iv = Buffer.from(parts[1], 'base64url');
  const ciphertext = Buffer.from(parts[2], 'base64url');
  const tag = Buffer.from(parts[3], 'base64url');
  if (tag.length !== TAG_BYTES) throw new Error('Invalid auth tag length');
  const key = loadKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv) as DecipherGCM;
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/** Encrypt when key is configured; pass through when it isn't. */
export function encryptFieldOpt(plaintext: string): string {
  return env.SETTINGS_ENCRYPTION_KEY ? encryptField(plaintext) : plaintext;
}

/** Decrypt when value looks encrypted; pass through otherwise. */
export function decryptFieldOpt(value: string | null | undefined): string | null | undefined {
  if (!isEncryptedField(value)) return value;
  try {
    return decryptField(value as string);
  } catch {
    return null;
  }
}
