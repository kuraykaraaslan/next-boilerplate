import { z } from 'zod';

export const UpsertSamlConfigDTO = z.object({
  isEnabled: z.boolean().optional(),
  idpEntityId: z.string().min(1).optional(),
  idpSsoUrl: z.string().url().optional(),
  idpCertificate: z.string().optional(),
  spPrivateKey: z.string().nullable().optional(),
  spCertificate: z.string().nullable().optional(),
  emailAttribute: z.string().min(1).optional(),
  nameAttribute: z.string().min(1).optional(),
  allowIdpInitiated: z.boolean().optional(),
  signRequests: z.boolean().optional(),
  nameIdFormat: z.string().nullable().optional(),
});

export type UpsertSamlConfigInput = z.infer<typeof UpsertSamlConfigDTO>;
