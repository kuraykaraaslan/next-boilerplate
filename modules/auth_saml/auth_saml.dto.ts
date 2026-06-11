import { z } from 'zod';
import { SAML_SIGNATURE_ALGORITHMS } from './auth_saml.enums';
import { SamlRoleMappingRulesSchema } from './auth_saml.types';

export const UpsertSamlConfigDTO = z.object({
  isEnabled: z.boolean().optional(),
  idpEntityId: z.string().min(1).optional(),
  idpSsoUrl: z.string().url().optional(),
  idpCertificate: z.string().optional(),
  idpSloUrl: z.string().url().or(z.literal('')).optional(),
  idpMetadataUrl: z.string().url().or(z.literal('')).optional(),
  spPrivateKey: z.string().nullable().optional(),
  spCertificate: z.string().nullable().optional(),
  spPrivateKeySecondary: z.string().nullable().optional(),
  spCertificateSecondary: z.string().nullable().optional(),
  emailAttribute: z.string().min(1).optional(),
  nameAttribute: z.string().min(1).optional(),
  roleAttribute: z.string().nullable().optional(),
  roleMappingRules: SamlRoleMappingRulesSchema.nullable().optional(),
  allowJitProvisioning: z.boolean().optional(),
  defaultMemberRole: z.string().nullable().optional(),
  allowIdpInitiated: z.boolean().optional(),
  signRequests: z.boolean().optional(),
  signatureAlgorithm: z.enum(SAML_SIGNATURE_ALGORITHMS).optional(),
  clockSkewMs: z.number().int().min(0).max(300000).optional(),
  wantAssertionsSigned: z.boolean().optional(),
  honorSessionNotOnOrAfter: z.boolean().optional(),
  nameIdFormat: z.string().nullable().optional(),
});

export type UpsertSamlConfigInput = z.infer<typeof UpsertSamlConfigDTO>;

// Body for the "import IdP config from metadata URL" admin action.
export const ImportSamlMetadataDTO = z.object({
  metadataUrl: z.string().url(),
});
export type ImportSamlMetadataInput = z.infer<typeof ImportSamlMetadataDTO>;
