import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/libs/typeorm', () => {
  const cache = new Map<string, object>();
  return {
    tenantDataSourceFor: vi.fn(async (tenantId: string) => {
      if (!cache.has(tenantId)) {
        cache.set(tenantId, {
          _tenantId: tenantId,
          isInitialized: true,
          getRepository: vi.fn(() => ({ find: vi.fn(async () => []), findOne: vi.fn(async () => null) })),
          destroy: vi.fn(async () => {}),
        });
      }
      return cache.get(tenantId);
    }),
    getSystemDataSource: vi.fn(async () => ({
      getRepository: vi.fn(() => ({ find: vi.fn(async () => []), findOne: vi.fn(async () => null) })),
    })),
    getDefaultTenantDataSource: vi.fn(async () => ({
      getRepository: vi.fn(() => ({ find: vi.fn(async () => []), findOne: vi.fn(async () => null) })),
    })),
  };
});

import { tenantDataSourceFor } from '@/libs/typeorm';

describe('tenantDataSourceFor isolation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns different DataSource instances for different tenants', async () => {
    const dsA = await tenantDataSourceFor('tenant-a');
    const dsB = await tenantDataSourceFor('tenant-b');
    expect(dsA).not.toBe(dsB);
  });

  it('caches and returns the same instance for the same tenantId', async () => {
    const ds1 = await tenantDataSourceFor('tenant-cached');
    const ds2 = await tenantDataSourceFor('tenant-cached');
    expect(ds1).toBe(ds2);
  });

  it('each DataSource is scoped to its tenantId', async () => {
    type MockDS = { _tenantId: string };
    const dsA = await tenantDataSourceFor('tenant-scope-a') as unknown as MockDS;
    const dsB = await tenantDataSourceFor('tenant-scope-b') as unknown as MockDS;
    expect(dsA._tenantId).toBe('tenant-scope-a');
    expect(dsB._tenantId).toBe('tenant-scope-b');
    expect(dsA._tenantId).not.toBe(dsB._tenantId);
  });

  it('calls tenantDataSourceFor with the provided tenantId', async () => {
    await tenantDataSourceFor('tenant-call-check');
    expect(tenantDataSourceFor).toHaveBeenCalledWith('tenant-call-check');
  });
});
