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
