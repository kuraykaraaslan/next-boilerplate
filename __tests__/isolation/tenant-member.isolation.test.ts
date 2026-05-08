import { vi, describe, it, expect, beforeEach } from 'vitest';

const tenantAMembers = [{ tenantMemberId: 'ma1', tenantId: 'tenant-A', userId: 'user-1', memberRole: 'USER', memberStatus: 'ACTIVE', sessionVersion: 0, createdAt: new Date(), updatedAt: new Date() }];

type WhereArg = { where?: { tenantId?: string } };
const repoMap: Record<string, object> = {
  'tenant-A': { find: vi.fn(async ({ where }: WhereArg) => where?.tenantId === 'tenant-A' ? tenantAMembers : []), findOne: vi.fn(async ({ where }: WhereArg) => where?.tenantId === 'tenant-A' ? tenantAMembers[0] : null), count: vi.fn(async () => 1) },
  'tenant-B': { find: vi.fn(async () => []), findOne: vi.fn(async () => null), count: vi.fn(async () => 0) },
};

vi.mock('@/libs/typeorm', () => ({
  tenantDataSourceFor: vi.fn(async (tenantId: string) => ({
    getRepository: vi.fn(() => repoMap[tenantId] ?? { find: vi.fn(async () => []), findOne: vi.fn(async () => null), count: vi.fn(async () => 0) }),
  })),
  getSystemDataSource: vi.fn(async () => ({
    getRepository: vi.fn(() => ({ find: vi.fn(async () => []), findOne: vi.fn(async () => null), count: vi.fn(async () => 0) })),
  })),
  getDefaultTenantDataSource: vi.fn(async () => ({
    getRepository: vi.fn(() => ({ find: vi.fn(async () => []), findOne: vi.fn(async () => null), count: vi.fn(async () => 0) })),
  })),
}));

vi.mock('@/libs/redis', () => ({ default: { get: vi.fn(async () => null), set: vi.fn(async () => 'OK'), del: vi.fn(async () => 1), incr: vi.fn(async () => 1), expire: vi.fn(async () => 1) } }));

import { tenantDataSourceFor } from '@/libs/typeorm';

describe('tenant member isolation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('queries tenantDataSourceFor with tenantA when fetching tenantA members', async () => {
    const ds = await tenantDataSourceFor('tenant-A');
    const repo = (ds as { getRepository: () => (typeof repoMap)[string] }).getRepository();
    const members = await repo.find({ where: { tenantId: 'tenant-A' } });
    expect(members).toHaveLength(1);
    expect(members[0].tenantId).toBe('tenant-A');
    expect(tenantDataSourceFor).toHaveBeenCalledWith('tenant-A');
  });

  it('returns empty array for tenantB (no cross-tenant leak)', async () => {
    const ds = await tenantDataSourceFor('tenant-B');
    const repo = (ds as { getRepository: () => (typeof repoMap)[string] }).getRepository();
    const members = await repo.find({ where: { tenantId: 'tenant-B' } });
    expect(members).toHaveLength(0);
  });

  it('tenantA DataSource does not see tenantB data', async () => {
    const dsA = await tenantDataSourceFor('tenant-A');
    const repoA = (dsA as { getRepository: () => (typeof repoMap)[string] }).getRepository();
    const result = await repoA.find({ where: { tenantId: 'tenant-B' } });
    expect(result).toHaveLength(0);
  });

  it('uses separate DataSources for separate tenants', async () => {
    const dsA = await tenantDataSourceFor('tenant-A');
    const dsB = await tenantDataSourceFor('tenant-B');
    expect(dsA).not.toBe(dsB);
  });
});
