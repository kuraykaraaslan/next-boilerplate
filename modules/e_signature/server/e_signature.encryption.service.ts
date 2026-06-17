import { createCipheriv, createDecipheriv, randomBytes, type CipherGCM, type DecipherGCM } from 'node:crypto';
import { env } from '@kuraykaraaslan/env';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';

/**
 * AES-256-GCM envelope encryption for sensitive setting values.
 *
 * Wire format (all base64url, joined by `.`):
 *   `v1.{iv}.{ciphertext}.{authTag}`
 *
 * v1 is the format version so we can migrate to KMS later without rewriting
 * stored ciphertext. The key comes from `SETTINGS_ENCRYPTION_KEY` (64-hex,
 * 32 bytes). If the env var is missing we surface a clear error rather than
 * silently writing plaintext to disk.
 */
export default class ESignatureEncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_BYTES = 12;        // GCM standard
  private static readonly TAG_BYTES = 16;
  private static readonly VERSION = 'v1';
  private static readonly PREFIX = `${ESignatureEncryptionService.VERSION}.`;

  private static loadKey(): Buffer {
    const raw = env.SETTINGS_ENCRYPTION_KEY;
    if (!raw) throw new AppError(E_SIGNATURE_MESSAGES.ENCRYPTION_KEY_MISSING, 500, ErrorCode.INTERNAL_ERROR);
    if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
      throw new AppError(`${E_SIGNATURE_MESSAGES.ENCRYPTION_KEY_MISSING}: expected 64 hex chars (32 bytes)`, 500, ErrorCode.INTERNAL_ERROR);
    }
    return Buffer.from(raw, 'hex');
  }

  static isEncrypted(value: string | null | undefined): boolean {
    return typeof value === 'string' && value.startsWith(ESignatureEncryptionService.PREFIX);
  }

  static encrypt(plaintext: string): string {
    const key = ESignatureEncryptionService.loadKey();
    const iv = randomBytes(ESignatureEncryptionService.IV_BYTES);
    const cipher = createCipheriv(ESignatureEncryptionService.ALGORITHM, key, iv) as CipherGCM;
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      ESignatureEncryptionService.VERSION,
      iv.toString('base64url'),
      ciphertext.toString('base64url'),
      tag.toString('base64url'),
    ].join('.');
  }

  static decrypt(encoded: string): string {
    const parts = encoded.split('.');
    if (parts.length !== 4 || parts[0] !== ESignatureEncryptionService.VERSION) {
      throw new AppError(E_SIGNATURE_MESSAGES.ENCRYPTED_VALUE_FORMAT_INVALID, 500, ErrorCode.INTERNAL_ERROR);
    }
    const iv = Buffer.from(parts[1], 'base64url');
    const ciphertext = Buffer.from(parts[2], 'base64url');
    const tag = Buffer.from(parts[3], 'base64url');
    if (tag.length !== ESignatureEncryptionService.TAG_BYTES) {
      throw new AppError(E_SIGNATURE_MESSAGES.ENCRYPTED_VALUE_AUTH_TAG_INVALID, 500, ErrorCode.INTERNAL_ERROR);
    }
    const key = ESignatureEncryptionService.loadKey();
    const decipher = createDecipheriv(ESignatureEncryptionService.ALGORITHM, key, iv) as DecipherGCM;
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  /** Encrypt iff a key is configured; otherwise return the plaintext unchanged. */
  static encryptOpt(plaintext: string): string {
    return env.SETTINGS_ENCRYPTION_KEY ? ESignatureEncryptionService.encrypt(plaintext) : plaintext;
  }

  /** Decrypt iff the value looks encrypted; otherwise return as-is. */
  static decryptOpt(value: string | null | undefined): string | null | undefined {
    if (!ESignatureEncryptionService.isEncrypted(value)) return value;
    try {
      return ESignatureEncryptionService.decrypt(value as string);
    } catch {
      // If decryption fails (rotated key etc.) we surface a sentinel rather
      // than the unreadable ciphertext to callers reading the value.
      return '';
    }
  }
}
