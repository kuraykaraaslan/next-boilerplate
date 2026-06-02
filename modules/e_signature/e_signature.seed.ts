import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@/modules/seed/seed.context';
import { SigningCertificate } from './entities/signing_certificate.entity';
import { TrustListEntry } from './entities/trust_list_entry.entity';

/**
 * Demo-data seed for the `e_signature` module (qualified electronic signatures
 * / eIDAS-style identity binding).
 *
 * Scoping note: NEITHER entity carries a `tenantId` column — signing
 * certificates are bound to a user and trust-list anchors are global CA roots,
 * so both live in the SYSTEM datasource (`ctx.systemRepo`). We never set
 * `tenantId` on these rows.
 *
 * House rules followed (mirrors `store.seed.ts`):
 *  - find-or-create via `ctx.foc(repo, where, create)` keyed on each entity's
 *    @Unique natural key so re-runs reuse rows instead of duplicating.
 *  - Only valid enum/union values: `loa` ∈ low|substantial|high,
 *    `source` ∈ etsi_lotl|tr_kamusm|manual.
 *  - Real Date objects for timestamp columns.
 *  - Cross-module user ids come from `ctx.refs` with the SEED_* fallbacks.
 */
export async function seedESignature(ctx: SeedContext): Promise<void> {
  const { foc, refs } = ctx;

  const userId = (refs.userId as string) ?? SEED_USER_ID;
  const adminUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const yearsAhead = (n: number) => new Date(now.getTime() + n * 365 * 24 * 60 * 60 * 1000);

  // ── Signing certificates (bound user certs, varied LoA / lifecycle) ─────────
  // certFingerprintSha256 is the unique natural key.
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

  // ── Trust list entries (CA roots from each ingestion source) ───────────────
  // Natural key: composite (country, subjectKeyIdentifier). The unique index is
  // partial (only WHERE subjectKeyIdentifier IS NOT NULL) — the manual entry
  // below carries a null SKI and is keyed by (country, issuerDN) instead.
  const PEM = (label: string): string =>
    [
      '-----BEGIN CERTIFICATE-----',
      `MIIB${Buffer.from(`seed-${label}`).toString('base64').slice(0, 40)}`,
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '-----END CERTIFICATE-----',
    ].join('\n');

  type TrustDef = {
    country: string;
    issuerDN: string;
    certificatePem: string;
    subjectKeyIdentifier: string | null;
    notBefore: Date;
    notAfter: Date;
    source: 'etsi_lotl' | 'tr_kamusm' | 'manual';
  };

  const trustDefs: TrustDef[] = [
    {
      // Pulled from the EU List of Trusted Lists.
      country: 'EE',
      issuerDN: 'CN=ESTEID2018, O=SK ID Solutions AS, C=EE',
      certificatePem: PEM('ee-esteid2018'),
      subjectKeyIdentifier: '1A2B3C4D5E6F70819900112233445566778899AA',
      notBefore: daysAgo(2000),
      notAfter: yearsAhead(10),
      source: 'etsi_lotl',
    },
    {
      // Pulled from the Turkish Kamu SM root program.
      country: 'TR',
      issuerDN: 'CN=Mali Mühür Elektronik Sertifika Hizmet Sağlayıcısı, O=Kamu SM, C=TR',
      certificatePem: PEM('tr-kamusm-root'),
      subjectKeyIdentifier: 'AABBCCDDEEFF00112233445566778899AABBCCDD',
      notBefore: daysAgo(2500),
      notAfter: yearsAhead(8),
      source: 'tr_kamusm',
    },
    {
      // Manually pinned root with no SKI (exercises the null-SKI / partial-index path).
      country: 'DE',
      issuerDN: 'CN=D-TRUST Root CA, O=D-TRUST GmbH, C=DE',
      certificatePem: PEM('de-dtrust-root'),
      subjectKeyIdentifier: null,
      notBefore: daysAgo(1500),
      notAfter: yearsAhead(5),
      source: 'manual',
    },
  ];

  let trustAnchorId: string | undefined;
  for (const def of trustDefs) {
    const where = (def.subjectKeyIdentifier !== null
      ? { country: def.country, subjectKeyIdentifier: def.subjectKeyIdentifier }
      : { country: def.country, issuerDN: def.issuerDN }) as FindOptionsWhere<TrustListEntry>;
    const entry = await foc(ctx.systemRepo<TrustListEntry>(TrustListEntry),
      where,
      {
        country: def.country,
        issuerDN: def.issuerDN,
        certificatePem: def.certificatePem,
        subjectKeyIdentifier: def.subjectKeyIdentifier,
        notBefore: def.notBefore,
        notAfter: def.notAfter,
        source: def.source,
      },
    );
    trustAnchorId ??= entry.trustListEntryId;
  }

  // ── Publish references for later modules ───────────────────────────────────
  refs.signingCertificateId = boundCertId;
  refs.trustListEntryId = trustAnchorId;

  ctx.log(`e_signature: ${certDefs.length} signing certificates, ${trustDefs.length} trust-list entries (system-scoped)`);
}
