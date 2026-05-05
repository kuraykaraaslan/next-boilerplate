import { z } from 'zod';
import { ApiKeyScopeEnum } from './api_key.enums';

export const ApiKeySchema = z.object({
  apiKeyId: z.string().uuid(),
  tenantId: z.string().uuid(),
  createdByUserId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  keyHash: z.string(),
  keyPrefix: z.string(),
  scopes: z.array(ApiKeyScopeEnum),
  isActive: z.boolean(),
  lastUsedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Never expose keyHash to clients
export const SafeApiKeySchema = ApiKeySchema.omit({ keyHash: true });

export type ApiKey = z.infer<typeof ApiKeySchema>;
export type SafeApiKey = z.infer<typeof SafeApiKeySchema>;
