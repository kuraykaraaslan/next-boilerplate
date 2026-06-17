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
  tenantDataSourceFor: vi.fn(),
  getSystemDataSource: vi.fn(),
}));

vi.mock('@kuraykaraaslan/webhook/server/webhook.service', () => ({
  default: { dispatchEvent: vi.fn(async () => undefined) },
}));

vi.mock('@kuraykaraaslan/setting/server/setting.service', () => ({
  default: { getValue: vi.fn(async () => null) },
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

export const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
export const ACTOR_ID = '660e8400-e29b-41d4-a716-446655440001';
export const LOG_ID = '770e8400-e29b-41d4-a716-446655440002';

export const mockLog = {
  auditLogId: LOG_ID,
  tenantId: TENANT_ID,
  actorId: ACTOR_ID,
  actorType: 'USER' as const,
  onBehalfOfActorId: null,
  action: 'auth.login',
  severity: 'low' as const,
  resourceType: null,
  resourceId: null,
  metadata: null,
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent',
  prevHash: null,
  rowHash: null,
  createdAt: new Date('2024-01-01'),
};

export function makeRepo(rows: any[] = [mockLog]) {
  const find = vi.fn(async () => rows);
  const findOne = vi.fn(async () => null);
  const count = vi.fn(async () => rows.length);
  const create = vi.fn((data: any) => ({ ...mockLog, ...data }));
  const save = vi.fn(async (entity: any) => entity);
  const del = vi.fn(async () => ({ affected: rows.length }));
  return { find, findOne, count, create, save, delete: del };
}
