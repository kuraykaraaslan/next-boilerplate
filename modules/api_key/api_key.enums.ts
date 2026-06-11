import { z } from 'zod';

export const ApiKeyScopeEnum = z.enum([
  'read',
  'write',
  'admin',
  // SCIM 2.0 (RFC 7644) — IdP provisioning bearer tokens.
  'scim:read',
  'scim:write',
]);
export type ApiKeyScope = z.infer<typeof ApiKeyScopeEnum>;

export const API_KEY_SCOPES: ApiKeyScope[] = [
  'read',
  'write',
  'admin',
  'scim:read',
  'scim:write',
];

// Environment namespace for a key. Baked into the raw-key prefix
// (`sk_live_…` / `sk_test_…`) so test credentials can never be mistaken for
// production ones and vice versa.
export const ApiKeyEnvEnum = z.enum(['live', 'test']);
export type ApiKeyEnv = z.infer<typeof ApiKeyEnvEnum>;
