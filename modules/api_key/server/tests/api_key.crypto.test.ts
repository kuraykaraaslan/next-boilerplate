import { describe, it, expect, vi } from 'vitest';

vi.mock('@kuraykaraaslan/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

import { generateRawKey, hashKey } from '../api_key.crypto';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('api_key.crypto.generateRawKey', () => {
  it('honours an explicit live environment prefix', () => {
    const key = generateRawKey(TENANT_ID, 'live');
    expect(key).toMatch(/^sk_live_/);
  });

  it('honours an explicit test environment prefix', () => {
    const key = generateRawKey(TENANT_ID, 'test');
    expect(key).toMatch(/^sk_test_/);
  });

  it('defaults the prefix to the deployment environment (test → sk_test_)', () => {
    // env mock above pins NODE_ENV to 'test'.
    const key = generateRawKey(TENANT_ID);
    expect(key).toMatch(/^sk_test_/);
  });

  it('includes tenant prefix segment', () => {
    const key = generateRawKey(TENANT_ID, 'live');
    // Tenant ID without dashes: "550e8400e29b41d4a716446655440000" → first 8 chars = "550e8400"
    expect(key).toContain('550e8400');
  });
});

describe('api_key.crypto.hashKey', () => {
  it('returns a 64-char hex string (SHA-256)', () => {
    const hash = hashKey('sk_live_test_key');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces the same hash for the same key', () => {
    const key = 'sk_live_deterministic';
    expect(hashKey(key)).toBe(hashKey(key));
  });

  it('produces different hashes for different keys', () => {
    expect(hashKey('key_a')).not.toBe(hashKey('key_b'));
  });
});
