import { z } from 'zod';
import { ApiKeyScopeEnum, ApiKeyEnvEnum } from './api_key.enums';

// A single IPv4/IPv6 address or CIDR block. Kept deliberately permissive — the
// runtime matcher (`ipMatchesAllowlist`) is the source of truth; this just
// bounds length and strips empties.
const IpRule = z.string().trim().min(1).max(64);

export const CreateApiKeyDTO = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  scopes: z.array(ApiKeyScopeEnum).min(1),
  environment: ApiKeyEnvEnum.optional(),
  ipAllowlist: z.array(IpRule).max(50).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const UpdateApiKeyDTO = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  ipAllowlist: z.array(IpRule).max(50).optional(),
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
