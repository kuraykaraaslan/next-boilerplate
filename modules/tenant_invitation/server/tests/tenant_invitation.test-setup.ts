import { vi } from 'vitest';

vi.mock('@kuraykaraaslan/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    INVITATION_TTL_SECONDS: 604800,
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
vi.mock('@kuraykaraaslan/tenant_member/server/tenant_member.service', () => ({
  default: {
    getByTenantAndUser: vi.fn(async () => null),
    create: vi.fn(async () => ({})),
  },
}));

import { getDataSource, tenantDataSourceFor } from '@kuraykaraaslan/db';

export const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
export const USER_ID = '550e8400-e29b-41d4-a716-446655440002';
export const INVITATION_ID = '550e8400-e29b-41d4-a716-446655440003';

export const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
export const pastDate = new Date(Date.now() - 1000);

export const mockInvitation = {
  invitationId: INVITATION_ID,
  tenantId: TENANT_ID,
  email: 'invitee@example.com',
  invitedByUserId: USER_ID,
  memberRole: 'USER' as const,
  token: 'hashed-token',
  status: 'PENDING' as const,
  expiresAt: futureDate,
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
}> = {}) {
  return {
    findOne: vi.fn(async () => mockInvitation),
    find: vi.fn(async () => [mockInvitation]),
    count: vi.fn(async () => 1),
    create: vi.fn((data: any) => ({ ...mockInvitation, ...data })),
    save: vi.fn(async (entity: any) => ({ ...mockInvitation, ...entity })),
    update: vi.fn(async () => ({ affected: 1 })),
    ...overrides,
  };
}

export function mockTenantDs(repo: ReturnType<typeof makeRepo>) {
  (tenantDataSourceFor as any).mockResolvedValue({
    getRepository: () => repo,
    transaction: async (fn: any) => fn({ getRepository: () => repo }),
  });
}

export function mockDefaultDs(repo: ReturnType<typeof makeRepo>) {
  (getDataSource as any).mockResolvedValue({ getRepository: () => repo });
}

export function mockSystemDs(userRepo: ReturnType<typeof vi.fn>) {
  (getDataSource as any).mockResolvedValue({ getRepository: () => ({ findOne: userRepo }) });
}
