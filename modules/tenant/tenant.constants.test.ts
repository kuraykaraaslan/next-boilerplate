import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ROOT_TENANT_ID, ROOT_TENANT_NAME, isRootTenant } from './tenant.constants';

describe('tenant.constants', () => {
  it('ROOT_TENANT_ID is a valid UUIDv4', () => {
    expect(z.string().uuid().safeParse(ROOT_TENANT_ID).success).toBe(true);
    expect(ROOT_TENANT_ID).toBe('00000000-0000-4000-8000-000000000000');
  });

  it('ROOT_TENANT_NAME is non-empty', () => {
    expect(ROOT_TENANT_NAME.length).toBeGreaterThan(0);
  });

  it('isRootTenant matches only the root UUID', () => {
    expect(isRootTenant(ROOT_TENANT_ID)).toBe(true);
    expect(isRootTenant('00000000-0000-0000-0000-000000000000')).toBe(false);
    expect(isRootTenant('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    expect(isRootTenant(null)).toBe(false);
    expect(isRootTenant(undefined)).toBe(false);
    expect(isRootTenant('')).toBe(false);
  });
});
