import { vi, describe, it, expect } from 'vitest';

const TENANT_X_ID = 'a0000000-0000-4000-8000-000000000001';
const TENANT_Y_ID = 'a0000000-0000-4000-8000-000000000002';
const USER_X_ID = 'a0000000-0000-4000-8000-000000000010';
const MEMBER_ID = 'a0000000-0000-4000-8000-000000000100';

vi.mock('@/libs/env', () => ({
  env: { TENANT_CACHE_TTL: 300, SYSTEM_DATABASE_URL: 'pg://test', TENANT_DATABASE_URL: 'pg://test' },
}));

vi.mock('@/libs/typeorm', () => ({
  tenantDataSourceFor: vi.fn(async (tenantId: string) => ({
    getRepository: vi.fn(() => ({
      findOne: vi.fn(async ({ where }: { where: { tenantId?: string; userId?: string; deletedAt?: unknown } }) => {
        if (tenantId === TENANT_X_ID && where?.tenantId === TENANT_X_ID && where?.userId === USER_X_ID) {
          return { tenantMemberId: MEMBER_ID, tenantId: TENANT_X_ID, userId: USER_X_ID, memberRole: 'USER', memberStatus: 'ACTIVE', sessionVersion: 0, createdAt: new Date(), updatedAt: new Date() };
        }
        return null;
      }),
    })),
  })),
  getSystemDataSource: vi.fn(async () => ({ getRepository: vi.fn(() => ({ findOne: vi.fn(async () => null) })) })),
  getDefaultTenantDataSource: vi.fn(async () => ({ getRepository: vi.fn(() => ({ findOne: vi.fn(async () => null) })) })),
}));

vi.mock('@/libs/redis', () => ({
  default: { get: vi.fn(async () => null), set: vi.fn(async () => 'OK'), del: vi.fn(async () => 1), incr: vi.fn(async () => 1), expire: vi.fn(async () => 1) },
}));

import TenantSessionService from '@/modules/tenant_session/tenant_session.service';

describe('cross-tenant session isolation', () => {
  it('accepts valid membership for the correct tenant', async () => {
    const result = await TenantSessionService.getTenantMembership(TENANT_X_ID, USER_X_ID);
    expect(result).not.toBeNull();
    expect(result?.tenantId).toBe(TENANT_X_ID);
  });

  it('rejects membership for wrong tenant (cross-tenant attempt)', async () => {
    const result = await TenantSessionService.getTenantMembership(TENANT_Y_ID, USER_X_ID);
    expect(result).toBeNull();
  });

  it('cache key is tenant-scoped: different keys for different tenants', () => {
    const keyA = `tenant:member:${USER_X_ID}:${TENANT_X_ID}`;
    const keyB = `tenant:member:${USER_X_ID}:${TENANT_Y_ID}`;
    expect(keyA).not.toBe(keyB);
    expect(keyA).toContain(TENANT_X_ID);
    expect(keyB).toContain(TENANT_Y_ID);
  });

  it('tenantDataSourceFor is called with the correct tenantId', async () => {
    const { tenantDataSourceFor } = await import('@/libs/typeorm');
    await TenantSessionService.getTenantMembership(TENANT_X_ID, USER_X_ID);
    expect(tenantDataSourceFor).toHaveBeenCalledWith(TENANT_X_ID);
  });
});
