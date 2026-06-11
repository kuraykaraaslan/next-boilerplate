import { z } from 'zod';
import { ApiKeyScopeEnum, ApiKeyEnvEnum } from './api_key.enums';
// Subnet (CIDR) validation is owned by the network module. A single host is a
// /32 — e.g. 192.168.1.182/32.
import { SubnetListSchema } from '@/modules/network';

export const CreateApiKeyDTO = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  scopes: z.array(ApiKeyScopeEnum).min(1),
  environment: ApiKeyEnvEnum.optional(),
  ipAllowlist: SubnetListSchema.optional(),
  expiresAt: z.string().datetime().optional(),
});

export const UpdateApiKeyDTO = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  ipAllowlist: SubnetListSchema.optional(),
  isActive: z.boolean().optional(),
});

export const RotateApiKeyDTO = z.object({
  // Grace window during which the old key keeps working alongside the successor.
  // 0 = revoke the old key immediately.
  graceSeconds: z.number().int().min(0).max(60 * 60 * 24 * 30).default(60 * 60 * 24),
});

export const ListApiKeysDTO = z.object({
  tenantId: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type CreateApiKeyInput = z.infer<typeof CreateApiKeyDTO>;
export type UpdateApiKeyInput = z.infer<typeof UpdateApiKeyDTO>;
export type ListApiKeysInput = z.infer<typeof ListApiKeysDTO>;
export type RotateApiKeyInput = z.infer<typeof RotateApiKeyDTO>;
