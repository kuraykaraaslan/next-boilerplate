import { z } from 'zod';

export const ApiKeyScopeEnum = z.enum(['read', 'write', 'admin']);
export type ApiKeyScope = z.infer<typeof ApiKeyScopeEnum>;

export const API_KEY_SCOPES: ApiKeyScope[] = ['read', 'write', 'admin'];
