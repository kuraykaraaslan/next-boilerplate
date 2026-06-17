import { vi } from 'vitest';
import { tenantDataSourceFor, getDataSource } from '@kuraykaraaslan/db';

export const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
export const USER_ID = '660e8400-e29b-41d4-a716-446655440001';
export const KEY_ID = '770e8400-e29b-41d4-a716-446655440002';

export const mockApiKey = {
  apiKeyId: KEY_ID,
  tenantId: TENANT_ID,
  createdByUserId: USER_ID,
  name: 'Test Key',
  description: null,
  keyHash: 'abc123hash',
  scopes: ['read'] as ('read' | 'write' | 'admin')[],
  keyEnv: 'live',
  ipAllowlist: [] as string[],
  isActive: true,
  lastUsedAt: null,
  lastUsedIp: null as string | null,
  usageCount: 0,
  successorKeyId: null as string | null,
  expiresAt: null as Date | null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export type MockApiKey = typeof mockApiKey;

export function makeMockRepo(row: MockApiKey | null = mockApiKey) {
  const findOne = vi.fn(async () => row);
  const find = vi.fn(async () => (row ? [row] : []));
  const findAndCount = vi.fn(async () => [row ? [row] : [], row ? 1 : 0] as const);
  const count = vi.fn(async () => (row ? 1 : 0));
  const create = vi.fn((data: any) => ({ ...mockApiKey, ...data }));
  const save = vi.fn(async (entity: any) => ({ ...mockApiKey, ...entity }));
  const remove = vi.fn(async () => {});
  const update = vi.fn(async () => {});
  const increment = vi.fn(async () => {});
  // Minimal query-builder used by sweepExpired().
  const createQueryBuilder = vi.fn(() => {
    const qb: any = {};
    for (const m of ['where', 'andWhere', 'orderBy']) qb[m] = vi.fn(() => qb);
    qb.getMany = vi.fn(async () => (row ? [row] : []));
    return qb;
  });
  return { findOne, find, findAndCount, count, create, save, remove, update, increment, createQueryBuilder };
}

export function setupTenantDs(row: MockApiKey | null = mockApiKey) {
  const repo = makeMockRepo(row);
  (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
  return repo;
}

export function setupDefaultTenantDs(row: MockApiKey | null = mockApiKey) {
  const repo = makeMockRepo(row);
  (getDataSource as any).mockResolvedValue({ getRepository: () => repo });
  return repo;
}
