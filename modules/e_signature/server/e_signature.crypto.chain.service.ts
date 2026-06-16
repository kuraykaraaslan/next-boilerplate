import { X509Certificate, AuthorityInfoAccessExtension } from '@peculiar/x509';
import Logger from '@nb/logger';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';
import { loadCertificate } from './e_signature.crypto.helpers';

/**
 * Validate the certificate chain up to one of the trust anchors supplied
 * by the caller (trust list service does the country-aware lookup).
 *
 * `intermediateCerts` may be empty if the leaf chains directly to a root.
 */
export async function validateChain({
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
    const leafCert = loadCertificate(leaf);
    const interCerts = intermediates.map((b) => loadCertificate(b));
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

/**
 * Soft OCSP check that knows the issuer. Returns `good` / `revoked` /
 * `unknown`. Transport errors and missing AIA URLs collapse to `unknown`
 * — callers decide whether to soft-fail.
 *
 * Production deployments should also verify the responder signature
 * against the issuer's public key (or an authorised OCSP signer); that
 * verification lives one layer deeper in `ESignatureOCSPService`.
 */
export async function checkRevocationOCSP(
  cert: Buffer,
  issuer?: Buffer,
): Promise<{ status: 'good' | 'revoked' | 'unknown' }> {
  const c = loadCertificate(cert);
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
