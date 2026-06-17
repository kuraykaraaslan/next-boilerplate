import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { TrustListEntry } from './entities/trust_list_entry.entity';

/**
 * Demo-data seed for the `e_signature` engine module: the global CA trust-list
 * anchors (eIDAS-style QES validation roots).
 *
 * The signing-certificate ↔ user bindings (an auth concern) are seeded by the
 * consumer module — see modules/auth_e_signature/auth_e_signature.seed.ts.
 *
 * Scoping note: TrustListEntry carries no `tenantId` column — trust-list
 * anchors are global CA roots, so they live in the SYSTEM datasource
 * (`ctx.systemRepo`).
 *
 * House rules followed (mirrors `store.seed.ts`):
 *  - find-or-create via `ctx.foc(repo, where, create)` keyed on the entity's
 *    @Unique natural key so re-runs reuse rows instead of duplicating.
 *  - Only valid enum/union values: `source` ∈ etsi_lotl|tr_kamusm|manual.
 *  - Real Date objects for timestamp columns.
 */
export async function seedESignature(ctx: SeedContext): Promise<void> {
  const { foc, refs } = ctx;

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const yearsAhead = (n: number) => new Date(now.getTime() + n * 365 * 24 * 60 * 60 * 1000);

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
  refs.trustListEntryId = trustAnchorId;

  ctx.log(`e_signature: ${trustDefs.length} trust-list entries (system-scoped)`);
}
