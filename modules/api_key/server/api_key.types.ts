import { z } from 'zod';
import { ApiKeyScopeEnum } from './api_key.enums';

export const ApiKeySchema = z.object({
  apiKeyId: z.string().uuid(),
  tenantId: z.string().uuid(),
  createdByUserId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  keyHash: z.string(),
  scopes: z.array(ApiKeyScopeEnum),
  // Defaulted so rows/caches written before these columns existed still parse.
  keyEnv: z.string().default('live'),
  ipAllowlist: z.array(z.string()).default([]),
  isActive: z.boolean(),
  lastUsedAt: z.date().nullable(),
  lastUsedIp: z.string().nullable().default(null),
  // `integer` round-trips through TypeORM as number; coerce defensively in case
  // a driver hands back a string, and default for legacy rows.
  usageCount: z.coerce.number().int().nonnegative().default(0),
  successorKeyId: z.string().uuid().nullable().default(null),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Never expose keyHash to clients
export const SafeApiKeySchema = ApiKeySchema.omit({ keyHash: true });

export type ApiKey = z.infer<typeof ApiKeySchema>;
export type SafeApiKey = z.infer<typeof SafeApiKeySchema>;
