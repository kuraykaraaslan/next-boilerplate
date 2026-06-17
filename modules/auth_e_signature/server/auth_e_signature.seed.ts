import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@kuraykaraaslan/seed/server/seed.context';
import { SigningCertificate } from './entities/signing_certificate.entity';

/**
 * Demo-data seed for `auth_e_signature`: signing certificates bound to demo
 * users (varied LoA / lifecycle). The CA trust-list anchors they validate
 * against are seeded by the `e_signature` engine (e_signature.seed.ts).
 *
 * Scoping note: SigningCertificate carries no `tenantId` column — certs are
 * bound to a user, so they live in the SYSTEM datasource (`ctx.systemRepo`).
 * find-or-create is keyed on `certFingerprintSha256` (the unique natural key).
 */
export async function seedAuthESignature(ctx: SeedContext): Promise<void> {
  const { foc, refs } = ctx;

  const userId = (refs.userId as string) ?? SEED_USER_ID;
  const adminUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const yearsAhead = (n: number) => new Date(now.getTime() + n * 365 * 24 * 60 * 60 * 1000);

  type CertDef = {
    fingerprint: string;
    userId: string;
    providerName: string;
    country: string;
    certSerialHex: string;
    issuerDN: string;
    subjectDN: string;
    commonName: string | null;
    nationalIdHash: string | null;
    loa: 'low' | 'substantial' | 'high';
    notBefore: Date;
    notAfter: Date;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
  };

  const certDefs: CertDef[] = [
    {
      // High LoA Turkish e-imza, actively used, healthy.
      fingerprint: 'aa00000000000000000000000000000000000000000000000000000000000001',
      userId,
      providerName: 'tr-kamusm-mobile',
      country: 'TR',
      certSerialHex: '0A1B2C3D4E5F0001',
      issuerDN: 'CN=Mali Mühür Elektronik Sertifika Hizmet Sağlayıcısı, O=Kamu SM, C=TR',
      subjectDN: 'CN=Demo Kullanıcı, serialNumber=11111111111, C=TR',
      commonName: 'Demo Kullanıcı',
      // sha256 of a fictional national identifier; plaintext is never stored.
      nationalIdHash: 'f1d2d2f924e986ac86fdf7b36c94bcdf32beec15f1d2d2f924e986ac86fdf7b3',
      loa: 'high',
      notBefore: daysAgo(120),
      notAfter: yearsAhead(2),
      lastUsedAt: daysAgo(2),
      revokedAt: null,
    },
    {
      // Substantial LoA Estonian Mobiil-ID, never used yet.
      fingerprint: 'bb00000000000000000000000000000000000000000000000000000000000002',
      userId: adminUserId,
      providerName: 'ee-mobiil-id',
      country: 'EE',
      certSerialHex: '0A1B2C3D4E5F0002',
      issuerDN: 'CN=ESTEID2018, O=SK ID Solutions AS, C=EE',
      subjectDN: 'CN=ADMIN,DEMO,38001085718, serialNumber=PNOEE-38001085718, C=EE',
      commonName: 'ADMIN,DEMO',
      nationalIdHash: '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b',
      loa: 'substantial',
      notBefore: daysAgo(30),
      notAfter: yearsAhead(3),
      lastUsedAt: null,
      revokedAt: null,
    },
    {
      // Low LoA German smartcard, revoked (exercises the revoked lifecycle).
      fingerprint: 'cc00000000000000000000000000000000000000000000000000000000000003',
      userId,
      providerName: 'de-smartcard',
      country: 'DE',
      certSerialHex: '0A1B2C3D4E5F0003',
      issuerDN: 'CN=D-TRUST Card CA, O=D-TRUST GmbH, C=DE',
      subjectDN: 'CN=Demo Anwender, C=DE',
      commonName: 'Demo Anwender',
      nationalIdHash: null,
      loa: 'low',
      notBefore: daysAgo(400),
      notAfter: yearsAhead(1),
      lastUsedAt: daysAgo(90),
      revokedAt: daysAgo(10),
    },
  ];

  let boundCertId: string | undefined;
  for (const def of certDefs) {
    const cert = await foc(ctx.systemRepo<SigningCertificate>(SigningCertificate),
      { certFingerprintSha256: def.fingerprint } as FindOptionsWhere<SigningCertificate>,
      {
        userId: def.userId,
        providerName: def.providerName,
        country: def.country,
        certFingerprintSha256: def.fingerprint,
        certSerialHex: def.certSerialHex,
        issuerDN: def.issuerDN,
        subjectDN: def.subjectDN,
        commonName: def.commonName,
        nationalIdHash: def.nationalIdHash,
        loa: def.loa,
        notBefore: def.notBefore,
        notAfter: def.notAfter,
        lastUsedAt: def.lastUsedAt,
        revokedAt: def.revokedAt,
      },
    );
    boundCertId ??= cert.signingCertificateId;
  }

  refs.signingCertificateId = boundCertId;

  ctx.log(`auth_e_signature: ${certDefs.length} signing certificates (system-scoped)`);
}
