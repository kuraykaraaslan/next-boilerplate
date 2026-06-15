import type { RawIdentityClaims } from './e_signature.types';
import { fingerprint } from './e_signature.crypto.helpers';
import { parseCertificate } from './e_signature.crypto.parse.service';
import {
  assertValidityWindow, assertKeyUsageForSignature, verifyChallengeSignature,
  subjectKeyIdentifierHex, authorityKeyIdentifierHex, hasExtendedKeyUsage,
} from './e_signature.crypto.verify.service';
import { validateChain, checkRevocationOCSP } from './e_signature.crypto.chain.service';

/**
 * Pure cryptography for the e_signature module: certificate parsing, signature
 * verification, chain validation, revocation checking, key-usage policy.
 *
 * Trust-root lookup is delegated to ESignatureTrustListService (cyclic-free).
 *
 * The implementation is split across focused modules (`e_signature.crypto.helpers`
 * cert loading/DN/hash helpers, `e_signature.crypto.parse.service` claim parsing,
 * `e_signature.crypto.verify.service` validity/key-usage/signature, and
 * `e_signature.crypto.chain.service` chain + OCSP); this class preserves the
 * single `ESignatureCryptoService.*` entry point its callers depend on.
 */
export default class ESignatureCryptoService {
  static parseCertificate(derOrPem: Buffer): RawIdentityClaims {
    return parseCertificate(derOrPem);
  }

  static fingerprint(der: ArrayBuffer | Buffer, algorithm: 'sha1' | 'sha256' = 'sha256'): string {
    return fingerprint(der, algorithm);
  }

  static assertValidityWindow(cert: Buffer, at: Date = new Date()): void {
    return assertValidityWindow(cert, at);
  }

  static assertKeyUsageForSignature(cert: Buffer): void {
    return assertKeyUsageForSignature(cert);
  }

  static verifyChallengeSignature(args: {
    challenge: string | Buffer;
    signature: Buffer;
    certificate: Buffer;
  }): boolean {
    return verifyChallengeSignature(args);
  }

  static validateChain(args: {
    leaf: Buffer;
    intermediates: Buffer[];
    trustRootsPem: string[];
    at?: Date;
  }): Promise<{ ok: boolean; leafIssuerDer?: Buffer }> {
    return validateChain(args);
  }

  static checkRevocationOCSP(
    cert: Buffer,
    issuer?: Buffer,
  ): Promise<{ status: 'good' | 'revoked' | 'unknown' }> {
    return checkRevocationOCSP(cert, issuer);
  }

  static subjectKeyIdentifierHex(cert: Buffer): string | null {
    return subjectKeyIdentifierHex(cert);
  }

  static authorityKeyIdentifierHex(cert: Buffer): string | null {
    return authorityKeyIdentifierHex(cert);
  }

  static hasExtendedKeyUsage(cert: Buffer, oid: string): boolean {
    return hasExtendedKeyUsage(cert, oid);
  }
}
