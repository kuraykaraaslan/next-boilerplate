import { vi } from 'vitest';

vi.mock('@kuraykaraaslan/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@kuraykaraaslan/db', () => ({
  getDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
}));

vi.mock('@kuraykaraaslan/redis', () => ({
  default: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    setex: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    ping: vi.fn(async () => 'PONG'),
    mget: vi.fn(async () => []),
    incrby: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    keys: vi.fn(async () => []),
    exists: vi.fn(async () => 0),
  },
  singleFlight: async (_key: string, fn: () => Promise<unknown>) => fn(),
  jitter: (n: number) => n,
}));
vi.mock('@kuraykaraaslan/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { getDataSource, tenantDataSourceFor } from '@kuraykaraaslan/db';

export const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
export const USER_ID = '550e8400-e29b-41d4-a716-446655440002';
export const MEMBER_ID = '550e8400-e29b-41d4-a716-446655440003';

export const mockMember = {
  tenantMemberId: MEMBER_ID,
  tenantId: TENANT_ID,
  userId: USER_ID,
  memberRole: 'USER' as const,
  memberStatus: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

export const mockUser = {
  userId: USER_ID,
  email: 'member@example.com',
  phone: null,
  userRole: 'USER' as const,
  userStatus: 'ACTIVE' as const,
  emailVerifiedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function makeRepo(overrides: Partial<{
  findOne: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  increment: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    findOne: vi.fn(async () => mockMember),
    find: vi.fn(async () => [mockMember]),
    count: vi.fn(async () => 1),
    create: vi.fn((data: any) => ({ ...mockMember, ...data })),
    save: vi.fn(async (entity: any) => ({ ...mockMember, ...entity })),
    update: vi.fn(async () => ({ affected: 1 })),
    increment: vi.fn(async () => ({})),
    ...overrides,
  };
}

export function mockDefaultDs(repo: ReturnType<typeof makeRepo>) {
  (getDataSource as any).mockResolvedValue({ getRepository: () => repo });
}

export function mockTenantDs(repo: ReturnType<typeof makeRepo>) {
  (tenantDataSourceFor as any).mockResolvedValue({
    getRepository: () => repo,
    transaction: async (fn: any) => fn({ getRepository: () => repo }),
  });
}
