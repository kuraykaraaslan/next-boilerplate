import 'reflect-metadata';
import { webcrypto, X509Certificate } from 'crypto';
import * as x509 from '@peculiar/x509';
import Logger from '@nb/logger';

// WebCrypto engine for @peculiar/x509 (used only for SP key/cert generation).
// Idempotent — first call wins.
let _providerSet = false;
function ensureProvider(): void {
  if (_providerSet) return;
  x509.cryptoProvider.set(webcrypto as unknown as Crypto);
  _providerSet = true;
}

const RSA_ALG: RsaHashedKeyGenParams = {
  name: 'RSASSA-PKCS1-v1_5',
  hash: 'SHA-256',
  publicExponent: new Uint8Array([1, 0, 1]),
  modulusLength: 2048,
};

export type GeneratedSpKeyPair = { privateKeyPem: string; certificatePem: string };

/**
 * Crypto helpers for auth_saml: per-tenant self-signed SP key/cert generation
 * and IdP-certificate expiry parsing. Pure, framework-agnostic, no DB access.
 */
export default class AuthSamlCryptoService {

  /**
   * Generate a unique self-signed X.509 SP key pair for a tenant. Returned as
   * PKCS#8 PEM private key + PEM certificate, the shapes @node-saml expects.
   * 5-year validity — long enough to outlive normal IdP onboarding cycles.
   */
  static async generateSpKeyPair(tenantId: string): Promise<GeneratedSpKeyPair> {
    ensureProvider();
    const keys = await webcrypto.subtle.generateKey(RSA_ALG, true, ['sign', 'verify']);
    const now = new Date();
    const notAfter = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365 * 5);
    const cert = await x509.X509CertificateGenerator.createSelfSigned({
      serialNumber: Date.now().toString(16),
      name: `CN=sp-${tenantId}`,
      notBefore: now,
      notAfter,
      keys,
      signingAlgorithm: RSA_ALG,
    });
    const pkcs8 = await webcrypto.subtle.exportKey('pkcs8', (keys as CryptoKeyPair).privateKey);
    const privateKeyPem = AuthSamlCryptoService.toPem('PRIVATE KEY', Buffer.from(pkcs8));
    return { privateKeyPem, certificatePem: cert.toString('pem') };
  }

  private static toPem(label: string, der: Buffer): string {
    const b64 = der.toString('base64').match(/.{1,64}/g)?.join('\n') ?? '';
    return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----\n`;
  }

  /**
   * Parse the `notAfter` (expiry) of an IdP certificate. Accepts a full PEM
   * block or bare base64 DER (the two forms tenant admins paste). Returns null
   * when the cert can't be parsed — never throws, so it is safe to call on the
   * upsert path with arbitrary admin input.
   */
  static parseCertNotAfter(rawCert: string | null | undefined): Date | null {
    if (!rawCert || !rawCert.trim()) return null;
    const pem = AuthSamlCryptoService.normalizeCertToPem(rawCert);
    try {
      const x = new X509Certificate(pem);
      const d = new Date(x.validTo);
      return Number.isNaN(d.getTime()) ? null : d;
    } catch (err) {
      Logger.warn(`[auth_saml] could not parse IdP certificate notAfter: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /** Wrap bare base64 DER in a CERTIFICATE PEM envelope if it isn't already PEM. */
  static normalizeCertToPem(rawCert: string): string {
    const trimmed = rawCert.trim();
    if (trimmed.includes('-----BEGIN')) return trimmed;
    const b64 = trimmed.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') ?? trimmed;
    return `-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----\n`;
  }

  /** Days until the given expiry (negative when already expired); null when no date. */
  static daysUntilExpiry(notAfter: Date | null | undefined, now: Date = new Date()): number | null {
    if (!notAfter) return null;
    return Math.floor((notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
}
