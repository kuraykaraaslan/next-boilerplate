import { z } from 'zod';
import { SAML_SIGNATURE_ALGORITHMS, SAML_ROLE_RULE_MATCHES } from './auth_saml.enums';

// ── ABAC role mapping rule ────────────────────────────────────────────────
// A single configurable attribute→role rule. Rules are evaluated in order; the
// first match wins. `attribute` defaults to the config's roleAttribute when
// omitted. `role` is a TenantMemberRole ('OWNER' | 'ADMIN' | 'USER').
export const SamlRoleMappingRuleSchema = z.object({
  attribute: z.string().min(1).optional(),
  match: z.enum(SAML_ROLE_RULE_MATCHES),
  value: z.string().min(1),
  role: z.enum(['OWNER', 'ADMIN', 'USER']),
});
export type SamlRoleMappingRule = z.infer<typeof SamlRoleMappingRuleSchema>;

export const SamlRoleMappingRulesSchema = z.array(SamlRoleMappingRuleSchema);

export const SafeSamlConfigSchema = z.object({
  samlConfigId: z.string(),
  tenantId: z.string(),
  isEnabled: z.boolean(),
  idpEntityId: z.string(),
  idpSsoUrl: z.string(),
  idpCertificate: z.string(),
  idpSloUrl: z.string().default(''),
  idpMetadataUrl: z.string().default(''),
  idpCertNotAfter: z.coerce.date().nullable().optional(),
  // never expose private key to client
  spCertificate: z.string().nullable(),
  spCertificateSecondary: z.string().nullable().optional(),
  emailAttribute: z.string(),
  nameAttribute: z.string(),
  roleAttribute: z.string().nullable().optional(),
  roleMappingRules: SamlRoleMappingRulesSchema.nullable().optional(),
  allowJitProvisioning: z.boolean(),
  defaultMemberRole: z.string().nullable().optional(),
  allowIdpInitiated: z.boolean(),
  signRequests: z.boolean(),
  signatureAlgorithm: z.enum(SAML_SIGNATURE_ALGORITHMS).default('sha256'),
  clockSkewMs: z.number().int().nonnegative().default(5000),
  wantAssertionsSigned: z.boolean().default(true),
  honorSessionNotOnOrAfter: z.boolean().default(true),
  nameIdFormat: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type SafeSamlConfig = z.infer<typeof SafeSamlConfigSchema>;

export type SamlProfile = {
  email: string;
  name: string | null;
  nameId: string;
  attributes: Record<string, string | string[]>;
  // Assertion `ID` attribute — used for replay detection.
  assertionId: string | null;
  // IdP `SessionIndex` — needed to construct a LogoutRequest for SLO.
  sessionIndex: string | null;
  // NameID format the IdP issued the subject in (for the LogoutRequest).
  nameIdFormat: string | null;
  // Assertion `SessionNotOnOrAfter` (ms epoch) — IdP-governed max session
  // lifetime. Null when the assertion does not carry one.
  sessionNotOnOrAfter: number | null;
};

export type SamlMetadata = {
  entityId: string;
  acsUrl: string;
  metadataUrl: string;
  xml: string;
};
