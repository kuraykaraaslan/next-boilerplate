import { createHash } from 'node:crypto';
import { X509Certificate } from '@peculiar/x509';
import Logger from '@/modules/logger';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';

export function loadCertificate(derOrPem: Buffer): X509Certificate {
  try {
    const text = derOrPem.toString('utf8');
    if (text.includes('-----BEGIN CERTIFICATE-----')) return new X509Certificate(text);
    // X509Certificate expects an ArrayBuffer or BufferSource, not a Node Buffer.
    const ab = derOrPem.buffer.slice(derOrPem.byteOffset, derOrPem.byteOffset + derOrPem.byteLength) as ArrayBuffer;
    return new X509Certificate(ab);
  } catch (err) {
    Logger.error(`certificate parse failed: ${err instanceof Error ? err.message : err}`);
    throw new AppError(E_SIGNATURE_MESSAGES.CERTIFICATE_PARSE_FAILED, 422, ErrorCode.VALIDATION_ERROR);
  }
}

export function fingerprint(der: ArrayBuffer | Buffer, algorithm: 'sha1' | 'sha256' = 'sha256'): string {
  const buf = Buffer.isBuffer(der) ? der : Buffer.from(der);
  return createHash(algorithm).update(buf).digest('hex').toUpperCase();
}

export function parseDN(dn: string): Record<string, string> {
  // Naive RFC 4514 split — sufficient for the attributes we need.
  const out: Record<string, string> = {};
  let i = 0;
  let buf = '';
  let key: string | null = null;
  let escaped = false;
  while (i < dn.length) {
    const c = dn[i];
    if (escaped) {
      buf += c;
      escaped = false;
    } else if (c === '\\') {
      escaped = true;
    } else if (c === '=' && key === null) {
      key = buf.trim();
      buf = '';
    } else if (c === ',' && key !== null) {
      out[key] = buf.trim();
      key = null;
      buf = '';
    } else {
      buf += c;
    }
    i++;
  }
  if (key !== null) out[key] = buf.trim();
  return out;
}

export function normalizeNationalId(raw: string): string {
  // Strip non-digit decoration ("PNOTR-12345678901", "TCKN12345678901", …)
  const digits = raw.replace(/\D/g, '');
  return digits;
}

export function toNodeHash(name: string): string {
  const n = name.replace('-', '').toUpperCase();
  if (n === 'SHA1') return 'SHA1';
  if (n === 'SHA384') return 'SHA384';
  if (n === 'SHA512') return 'SHA512';
  return 'SHA256';
}
