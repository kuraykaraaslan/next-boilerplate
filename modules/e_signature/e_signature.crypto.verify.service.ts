import { createVerify, constants as cryptoConstants, KeyObject, createPublicKey } from 'node:crypto';
import {
  ExtendedKeyUsageExtension, KeyUsagesExtension, KeyUsageFlags,
  AuthorityKeyIdentifierExtension, SubjectKeyIdentifierExtension,
} from '@peculiar/x509';
import Logger from '@/modules/logger';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';
import { loadCertificate, toNodeHash } from './e_signature.crypto.helpers';

export function assertValidityWindow(cert: Buffer, at: Date = new Date()): void {
  const c = loadCertificate(cert);
  if (at < c.notBefore) throw new AppError(E_SIGNATURE_MESSAGES.CERTIFICATE_NOT_YET_VALID, 422, ErrorCode.VALIDATION_ERROR);
  if (at > c.notAfter) throw new AppError(E_SIGNATURE_MESSAGES.CERTIFICATE_EXPIRED, 422, ErrorCode.VALIDATION_ERROR);
}

// Non-repudiation (a.k.a. contentCommitment) is what eIDAS QSCD certs
// require for AdES/QES signatures.
export function assertKeyUsageForSignature(cert: Buffer): void {
  const c = loadCertificate(cert);
  const ku = c.getExtension(KeyUsagesExtension);
  if (!ku) throw new AppError(E_SIGNATURE_MESSAGES.CERTIFICATE_KEY_USAGE_INVALID, 422, ErrorCode.VALIDATION_ERROR);
  const flags = ku.usages as unknown as number;
  if ((flags & KeyUsageFlags.nonRepudiation) === 0) {
    throw new AppError(E_SIGNATURE_MESSAGES.CERTIFICATE_KEY_USAGE_INVALID, 422, ErrorCode.VALIDATION_ERROR);
  }
}

export function verifyChallengeSignature({
  challenge,
  signature,
  certificate,
}: {
  challenge: string | Buffer;
  signature: Buffer;
  certificate: Buffer;
}): boolean {
  try {
    const cert = loadCertificate(certificate);
    const spki = Buffer.from(cert.publicKey.rawData);
    const key: KeyObject = createPublicKey({ key: spki, format: 'der', type: 'spki' });
    const algorithm = (cert.signatureAlgorithm?.hash?.name as string) ?? 'SHA-256';
    const nodeAlgo = toNodeHash(algorithm);
    const verifier = createVerify(nodeAlgo);
    const challengeBuf = typeof challenge === 'string' ? Buffer.from(challenge, 'utf8') : challenge;
    verifier.update(challengeBuf);
    verifier.end();
    // PKCS#1 v1.5 by default; PSS callers should bypass this helper.
    return verifier.verify(
      {
        key,
        padding: cryptoConstants.RSA_PKCS1_PADDING,
      },
      signature,
    );
  } catch (err) {
    Logger.warn(`signature verification failed: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

// ── Helpers exposed for trust list service ────────────────────────────────
export function subjectKeyIdentifierHex(cert: Buffer): string | null {
  const c = loadCertificate(cert);
  const ski = c.getExtension(SubjectKeyIdentifierExtension);
  return ski?.keyId ? ski.keyId.toUpperCase() : null;
}

export function authorityKeyIdentifierHex(cert: Buffer): string | null {
  const c = loadCertificate(cert);
  const aki = c.getExtension(AuthorityKeyIdentifierExtension);
  return aki?.keyId ? aki.keyId.toUpperCase() : null;
}

export function hasExtendedKeyUsage(cert: Buffer, oid: string): boolean {
  const c = loadCertificate(cert);
  const eku = c.getExtension(ExtendedKeyUsageExtension);
  return Boolean(eku?.usages?.includes(oid));
}
