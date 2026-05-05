import { z } from 'zod';
import { ApiKeyScopeEnum } from './api_key.enums';

export const CreateApiKeyDTO = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  scopes: z.array(ApiKeyScopeEnum).min(1),
  expiresAt: z.string().datetime().optional(),
});

export const UpdateApiKeyDTO = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const ListApiKeysDTO = z.object({
  tenantId: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type CreateApiKeyInput = z.infer<typeof CreateApiKeyDTO>;
export type UpdateApiKeyInput = z.infer<typeof UpdateApiKeyDTO>;
export type ListApiKeysInput = z.infer<typeof ListApiKeysDTO>;
