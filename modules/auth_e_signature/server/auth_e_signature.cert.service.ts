import 'reflect-metadata';
import { getDataSource } from '@kuraykaraaslan/db';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import Logger from '@kuraykaraaslan/logger';
import ESignatureIdentityService from '@kuraykaraaslan/e_signature/server/e_signature.identity.service';
import { E_SIGNATURE_MESSAGES } from '@kuraykaraaslan/e_signature/server/e_signature.messages';
import type { BoundCertificate, CountryCode, RawIdentityClaims } from '@kuraykaraaslan/e_signature/server/e_signature.types';
import type { LoA } from '@kuraykaraaslan/e_signature/server/e_signature.enums';
import { SigningCertificate } from './entities/signing_certificate.entity';

/**
 * Certificate ↔ user binding store for e-signature login. Consumes the
 * `e_signature` engine for the (pure) national-id hash; everything else here is
 * the auth-layer mapping between a verified certificate and an account.
 */
export default class AuthESignatureCertService {
  static async findByFingerprint(fingerprint: string): Promise<SigningCertificate | null> {
    const ds = await getDataSource();
    return ds.getRepository(SigningCertificate).findOne({
      where: { certFingerprintSha256: fingerprint.toUpperCase() },
    });
  }

  static async findByUser(userId: string): Promise<SigningCertificate[]> {
    const ds = await getDataSource();
    return ds.getRepository(SigningCertificate).find({
      where: { userId },
      order: { boundAt: 'DESC' },
    });
  }

  static async bind({
    userId,
    providerName,
    country,
    claims,
    loa,
    subjectDN,
  }: {
    userId: string;
    providerName: string;
    country: CountryCode;
    claims: RawIdentityClaims;
    loa: LoA;
    subjectDN: string;
  }): Promise<SigningCertificate> {
    const ds = await getDataSource();
    const repo = ds.getRepository(SigningCertificate);

    const existing = await repo.findOne({
      where: { certFingerprintSha256: claims.certFingerprintSha256.toUpperCase() },
    });
    if (existing && existing.userId !== userId) {
      throw new AppError(E_SIGNATURE_MESSAGES.BIND_CERT_ALREADY_BOUND, 409, ErrorCode.CONFLICT);
    }
    if (existing) {
      return existing;
    }

    const row = repo.create({
      userId,
      providerName,
      country,
      certFingerprintSha256: claims.certFingerprintSha256.toUpperCase(),
      certSerialHex: claims.certSerialHex.toUpperCase(),
      issuerDN: claims.issuerDN,
      subjectDN,
      commonName: claims.commonName,
      nationalIdHash: claims.nationalId ? ESignatureIdentityService.hashNationalId(claims.nationalId, country) : null,
      loa,
      notBefore: new Date(claims.notBefore),
      notAfter: new Date(claims.notAfter),
      lastUsedAt: null,
      revokedAt: null,
    });
    return repo.save(row);
  }

  static async markUsed(signingCertificateId: string): Promise<void> {
    const ds = await getDataSource();
    try {
      await ds
        .getRepository(SigningCertificate)
        .update({ signingCertificateId }, { lastUsedAt: new Date() });
    } catch (err) {
      Logger.warn(`markUsed failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  static async revoke(signingCertificateId: string): Promise<void> {
    const ds = await getDataSource();
    await ds
      .getRepository(SigningCertificate)
      .update({ signingCertificateId }, { revokedAt: new Date() });
  }

  static toBound(entity: SigningCertificate): BoundCertificate {
    return {
      signingCertificateId: entity.signingCertificateId,
      userId: entity.userId,
      providerName: entity.providerName,
      country: entity.country as CountryCode,
      certFingerprintSha256: entity.certFingerprintSha256,
      certSerialHex: entity.certSerialHex,
      issuerDN: entity.issuerDN,
      subjectDN: entity.subjectDN,
      commonName: entity.commonName,
      nationalIdHash: entity.nationalIdHash,
      loa: entity.loa,
      notBefore: entity.notBefore,
      notAfter: entity.notAfter,
      boundAt: entity.boundAt,
      lastUsedAt: entity.lastUsedAt,
      revokedAt: entity.revokedAt,
    };
  }
}
