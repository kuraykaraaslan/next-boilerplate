import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { SamlConfig } from './entities/saml_config.entity';
import { SAML_NAME_ID_FORMATS } from './auth_saml.enums';

/**
 * Demo seed for the `auth_saml` module.
 *
 * The module owns a single tenant-scoped entity, `SamlConfig`, whose `tenantId`
 * column carries a UNIQUE index — there is at most ONE SAML configuration per
 * tenant. So the natural key in `foc` is `tenantId` (not a slug/sku), and we
 * seed exactly one richly-populated, enabled config row that exercises the
 * module's real features: a configured IdP, attribute mapping (including a role
 * attribute), JIT provisioning with a default member role, and a valid
 * SAML NameID format pulled straight from `SAML_NAME_ID_FORMATS`.
 *
 * House rules followed:
 *  - go through `ctx.foc(repo, where, create)` with a natural key so re-runs reuse the row;
 *  - use only valid enum values for `nameIdFormat` (from SAML_NAME_ID_FORMATS)
 *    and a valid `defaultMemberRole` ('OWNER' | 'ADMIN' | 'USER' per TenantMemberRole);
 *  - the entity has a `tenantId` column → tenant-scoped repo + `tenantId: ctx.tenantId`.
 */
export async function seedAuthSaml(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // A non-secret demo certificate body. Real deployments paste the IdP's signing
  // certificate here; the seed value just needs to look like a PEM block so the
  // admin UI / metadata views render something believable.
  const idpCertificate = [
    '-----BEGIN CERTIFICATE-----',
    'MIIDdzCCAl+gAwIBAgIEXAMPLEDEMOseed00000000000000000000000000000000',
    'demoDemoDemoDemoDemoDemoDemoDemoDemoDemoDemoDemoDemoDemoDemoDemoDemo',
    'seedSeedSeedSeedSeedSeedSeedSeedSeedSeedSeedSeedSeedSeedSeedSeedSeed',
    '-----END CERTIFICATE-----',
  ].join('\n');

  const samlRepo = ctx.repo<SamlConfig>(SamlConfig);

  // ── One SAML config per tenant (tenantId is the UNIQUE natural key) ─────────
  const config = await foc(samlRepo,
    { tenantId } as FindOptionsWhere<SamlConfig>,
    {
      tenantId,
      isEnabled: true,
      // ── IdP settings (Okta-style demo endpoints) ──
      idpEntityId: `https://idp.seed-demo.example.com/saml/metadata/${tenantId}`,
      idpSsoUrl: 'https://idp.seed-demo.example.com/saml/sso',
      idpCertificate,
      // ── SP settings: left auto-derived (no demo private key on disk) ──
      spPrivateKey: null,
      spCertificate: null,
      // ── Attribute mapping (exercise the role-attribute path) ──
      emailAttribute: 'email',
      nameAttribute: 'displayName',
      roleAttribute: 'memberOf',
      // ── JIT provisioning: unknown SSO users get auto-created as USER ──
      allowJitProvisioning: true,
      defaultMemberRole: 'USER',
      // ── Options: IdP-initiated allowed, signed requests, email NameID ──
      allowIdpInitiated: true,
      signRequests: true,
      nameIdFormat: SAML_NAME_ID_FORMATS.EMAIL,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // ~7 days ago
      updatedAt: new Date(),
    },
  );

  // Publish for any later module that links to the tenant's SSO configuration.
  refs.samlConfigId = config.samlConfigId;

  ctx.log(`auth_saml: 1 SAML config (JIT-enabled, email NameID) for ${tenantId}`);
}
