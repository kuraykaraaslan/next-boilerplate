import { createHash, createVerify, constants as cryptoConstants, KeyObject, createPublicKey } from 'node:crypto';
import { X509Certificate, ExtendedKeyUsageExtension, KeyUsagesExtension, KeyUsageFlags, AuthorityKeyIdentifierExtension, SubjectKeyIdentifierExtension, AuthorityInfoAccessExtension } from '@peculiar/x509';
import Logger from '@/modules/logger';
import type { CountryCode, RawIdentityClaims } from './e_signature.types';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';

/**
 * Pure cryptography for the e_signature module: certificate parsing, signature
 * verification, chain validation, revocation checking, key-usage policy.
 *
 * Trust-root lookup is delegated to ESignatureTrustListService (cyclic-free).
 */
export default class ESignatureCryptoService {
  // ── Certificate parsing ───────────────────────────────────────────────────
  static parseCertificate(derOrPem: Buffer): RawIdentityClaims {
    const cert = ESignatureCryptoService.loadCertificate(derOrPem);
    const subjectMap = ESignatureCryptoService.parseDN(cert.subjectName.toString());
    const issuerMap = ESignatureCryptoService.parseDN(cert.issuerName.toString());

    const fingerprintSha256 = ESignatureCryptoService.fingerprint(cert.rawData, 'sha256');
    const serialHex = cert.serialNumber.toUpperCase();

    // TC Kimlik No is conventionally encoded in the Subject `serialNumber`
    // attribute on Turkish QSCD certificates (format: "TCKN12345678901" or
    // the bare 11-digit number). EU eIDAS QC certificates likewise put the
    // PersonalIdentifier in `2.5.4.5` (serialNumber).
    const nationalIdRaw = subjectMap['serialNumber'] ?? subjectMap['2.5.4.5'] ?? null;
    const nationalId = nationalIdRaw ? ESignatureCryptoService.normalizeNationalId(nationalIdRaw) : null;

    return {
      commonName: subjectMap['CN'] ?? null,
      givenName: subjectMap['GN'] ?? subjectMap['2.5.4.42'] ?? null,
      familyName: subjectMap['SN'] ?? subjectMap['2.5.4.4'] ?? null,
      serialNumber: nationalIdRaw,
      nationalId,
      birthDate: null, // Some QC certs include `dateOfBirth` (2.5.4.3) but it's rare
      issuerDN: cert.issuerName.toString(),
      issuerCountry: (issuerMap['C'] as CountryCode | undefined) ?? null,
      certSerialHex: serialHex,
      certFingerprintSha256: fingerprintSha256,
      notBefore: cert.notBefore.toISOString(),
      notAfter: cert.notAfter.toISOString(),
    };
  }

  private static loadCertificate(derOrPem: Buffer): X509Certificate {
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

  static fingerprint(der: ArrayBuffer | Buffer, algorithm: 'sha1' | 'sha256' = 'sha256'): string {
    const buf = Buffer.isBuffer(der) ? der : Buffer.from(der);
    return createHash(algorithm).update(buf).digest('hex').toUpperCase();
  }

  private static parseDN(dn: string): Record<string, string> {
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

  private static normalizeNationalId(raw: string): string {
    // Strip non-digit decoration ("PNOTR-12345678901", "TCKN12345678901", …)
    const digits = raw.replace(/\D/g, '');
    return digits;
  }

  // ── Validity window ───────────────────────────────────────────────────────
  static assertValidityWindow(cert: Buffer, at: Date = new Date()): void {
    const c = ESignatureCryptoService.loadCertificate(cert);
    if (at < c.notBefore) throw new AppError(E_SIGNATURE_MESSAGES.CERTIFICATE_NOT_YET_VALID, 422, ErrorCode.VALIDATION_ERROR);
    if (at > c.notAfter) throw new AppError(E_SIGNATURE_MESSAGES.CERTIFICATE_EXPIRED, 422, ErrorCode.VALIDATION_ERROR);
  }

  // ── Key usage policy ──────────────────────────────────────────────────────
  // Non-repudiation (a.k.a. contentCommitment) is what eIDAS QSCD certs
  // require for AdES/QES signatures.
  static assertKeyUsageForSignature(cert: Buffer): void {
    const c = ESignatureCryptoService.loadCertificate(cert);
    const ku = c.getExtension(KeyUsagesExtension);
    if (!ku) throw new AppError(E_SIGNATURE_MESSAGES.CERTIFICATE_KEY_USAGE_INVALID, 422, ErrorCode.VALIDATION_ERROR);
    const flags = ku.usages as unknown as number;
    if ((flags & KeyUsageFlags.nonRepudiation) === 0) {
      throw new AppError(E_SIGNATURE_MESSAGES.CERTIFICATE_KEY_USAGE_INVALID, 422, ErrorCode.VALIDATION_ERROR);
    }
  }

  // ── Signature verification ────────────────────────────────────────────────
  static verifyChallengeSignature({
    challenge,
    signature,
    certificate,
  }: {
    challenge: string | Buffer;
    signature: Buffer;
    certificate: Buffer;
  }): boolean {
    try {
      const cert = ESignatureCryptoService.loadCertificate(certificate);
      const spki = Buffer.from(cert.publicKey.rawData);
      const key: KeyObject = createPublicKey({ key: spki, format: 'der', type: 'spki' });
      const algorithm = (cert.signatureAlgorithm?.hash?.name as string) ?? 'SHA-256';
      const nodeAlgo = ESignatureCryptoService.toNodeHash(algorithm);
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

  private static toNodeHash(name: string): string {
    const n = name.replace('-', '').toUpperCase();
    if (n === 'SHA1') return 'SHA1';
    if (n === 'SHA384') return 'SHA384';
    if (n === 'SHA512') return 'SHA512';
    return 'SHA256';
  }

  // ── Chain validation ──────────────────────────────────────────────────────
  /**
   * Validate the certificate chain up to one of the trust anchors supplied
   * by the caller (trust list service does the country-aware lookup).
   *
   * `intermediateCerts` may be empty if the leaf chains directly to a root.
   */
  static async validateChain({
    leaf,
    intermediates,
    trustRootsPem,
    at = new Date(),
  }: {
    leaf: Buffer;
    intermediates: Buffer[];
    trustRootsPem: string[];
    at?: Date;
  }): Promise<{ ok: boolean; leafIssuerDer?: Buffer }> {
    if (trustRootsPem.length === 0) {
      throw new AppError(E_SIGNATURE_MESSAGES.CERTIFICATE_TRUST_ROOT_MISSING, 503, ErrorCode.FEATURE_NOT_AVAILABLE);
    }
    try {
      const leafCert = ESignatureCryptoService.loadCertificate(leaf);
      const interCerts = intermediates.map((b) => ESignatureCryptoService.loadCertificate(b));
      const rootCerts = trustRootsPem.map((p) => new X509Certificate(p));

      let current = leafCert;
      let leafIssuerDer: Buffer | undefined;
      const used = new Set<number>();
      const maxDepth = 8;
      for (let depth = 0; depth < maxDepth; depth++) {
        if (at < current.notBefore || at > current.notAfter) {
          throw new AppError(E_SIGNATURE_MESSAGES.CERTIFICATE_EXPIRED, 422, ErrorCode.VALIDATION_ERROR);
        }
        // Self-signed → must match a trust root by DN + verify
        if (current.issuerName.toString() === current.subjectName.toString()) {
          const matched = rootCerts.find((r) => r.subjectName.toString() === current.subjectName.toString());
          if (!matched) throw new AppError(E_SIGNATURE_MESSAGES.CERTIFICATE_CHAIN_INVALID, 422, ErrorCode.VALIDATION_ERROR);
          const ok = await current.verify({ publicKey: matched.publicKey });
          if (depth === 0) leafIssuerDer = Buffer.from(matched.rawData);
          return { ok, leafIssuerDer };
        }
        // Find issuer in intermediates first, then roots
        const interIdx = interCerts.findIndex(
          (c, idx) => !used.has(idx) && c.subjectName.toString() === current.issuerName.toString(),
        );
        if (interIdx >= 0) {
          const issuer = interCerts[interIdx];
          const ok = await current.verify({ publicKey: issuer.publicKey });
          if (depth === 0) leafIssuerDer = Buffer.from(issuer.rawData);
          if (!ok) return { ok: false, leafIssuerDer };
          used.add(interIdx);
          current = issuer;
          continue;
        }
        const root = rootCerts.find((r) => r.subjectName.toString() === current.issuerName.toString());
        if (root) {
          const ok = await current.verify({ publicKey: root.publicKey });
          if (depth === 0) leafIssuerDer = Buffer.from(root.rawData);
          return { ok, leafIssuerDer };
        }
        throw new AppError(E_SIGNATURE_MESSAGES.CERTIFICATE_CHAIN_INVALID, 422, ErrorCode.VALIDATION_ERROR);
      }
      throw new AppError(E_SIGNATURE_MESSAGES.CERTIFICATE_CHAIN_INVALID, 422, ErrorCode.VALIDATION_ERROR);
    } catch (err) {
      if (err instanceof AppError) throw err;
      Logger.warn(`chain validation failed: ${err instanceof Error ? err.message : err}`);
      throw new AppError(E_SIGNATURE_MESSAGES.CERTIFICATE_CHAIN_INVALID, 422, ErrorCode.VALIDATION_ERROR);
    }
  }

  // ── Revocation (OCSP) ─────────────────────────────────────────────────────
  /**
   * Soft OCSP check that knows the issuer. Returns `good` / `revoked` /
   * `unknown`. Transport errors and missing AIA URLs collapse to `unknown`
   * — callers decide whether to soft-fail.
   *
   * Production deployments should also verify the responder signature
   * against the issuer's public key (or an authorised OCSP signer); that
   * verification lives one layer deeper in `ESignatureOCSPService`.
   */
  static async checkRevocationOCSP(
    cert: Buffer,
    issuer?: Buffer,
  ): Promise<{ status: 'good' | 'revoked' | 'unknown' }> {
    const c = ESignatureCryptoService.loadCertificate(cert);
    const aia = c.getExtension(AuthorityInfoAccessExtension);
    const ocspUrl = aia?.ocsp?.[0]?.value;
    if (!ocspUrl) return { status: 'unknown' };
    if (!issuer) {
      // Without the issuer we cannot build a valid OCSP CertID — return
      // unknown so caller can fall back to CRL or soft-pass per policy.
      return { status: 'unknown' };
    }
    // Lazy-imported so the crypto service stays usable in tests that never
    // touch revocation (and don't want to bring in the pkijs/asn1js graph).
    const { default: ESignatureOCSPService } = await import('./e_signature.ocsp.service');
    const result = await ESignatureOCSPService.check({
      leafDer: cert,
      issuerDer: issuer,
      responderUrlOverride: ocspUrl,
    });
    return { status: result.status };
  }

  // ── Helpers exposed for trust list service ────────────────────────────────
  static subjectKeyIdentifierHex(cert: Buffer): string | null {
    const c = ESignatureCryptoService.loadCertificate(cert);
    const ski = c.getExtension(SubjectKeyIdentifierExtension);
    return ski?.keyId ? ski.keyId.toUpperCase() : null;
  }

  static authorityKeyIdentifierHex(cert: Buffer): string | null {
    const c = ESignatureCryptoService.loadCertificate(cert);
    const aki = c.getExtension(AuthorityKeyIdentifierExtension);
    return aki?.keyId ? aki.keyId.toUpperCase() : null;
  }

  static hasExtendedKeyUsage(cert: Buffer, oid: string): boolean {
    const c = ESignatureCryptoService.loadCertificate(cert);
    const eku = c.getExtension(ExtendedKeyUsageExtension);
    return Boolean(eku?.usages?.includes(oid));
  }
}
