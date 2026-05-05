import { z } from 'zod';

export const SafeSamlConfigSchema = z.object({
  samlConfigId: z.string(),
  tenantId: z.string(),
  isEnabled: z.boolean(),
  idpEntityId: z.string(),
  idpSsoUrl: z.string(),
  idpCertificate: z.string(),
  // never expose private key to client
  spCertificate: z.string().nullable(),
  emailAttribute: z.string(),
  nameAttribute: z.string(),
  allowIdpInitiated: z.boolean(),
  signRequests: z.boolean(),
  nameIdFormat: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SafeSamlConfig = z.infer<typeof SafeSamlConfigSchema>;

export type SamlProfile = {
  email: string;
  name: string | null;
  nameId: string;
  attributes: Record<string, string | string[]>;
};

export type SamlMetadata = {
  entityId: string;
  acsUrl: string;
  metadataUrl: string;
  xml: string;
};
