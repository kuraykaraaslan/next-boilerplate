import crypto from 'crypto';
import { env } from '@kuraykaraaslan/env';
import type { ApiKeyEnv } from './api_key.enums';

// Default raw-key environment, derived from the deployment mode. A prod/vercel
// deployment mints `sk_live_…`; everything else mints `sk_test_…` so test keys
// can never be confused with production ones.
export const DEFAULT_KEY_ENV: ApiKeyEnv =
  env.NODE_ENV === 'production' || env.NODE_ENV === 'vercel' ? 'live' : 'test';

export function generateRawKey(tenantId: string, environment: ApiKeyEnv = DEFAULT_KEY_ENV): string {
  const prefix = tenantId.replace(/-/g, '').slice(0, 8);
  const secret = crypto.randomBytes(24).toString('hex');
  return `sk_${environment}_${prefix}_${secret}`;
}

export function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}
