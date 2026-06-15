import { vi } from 'vitest';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';

vi.mock('@/modules/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@/modules/db', () => ({
  tenantDataSourceFor: vi.fn(),
}));

vi.mock('@/modules/redis', () => ({
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

vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { tenantDataSourceFor } from '@/modules/db';

export const TENANT_ID = ROOT_TENANT_ID;

export const mockSetting = {
  tenantId: ROOT_TENANT_ID,
  key: 'site_name',
  value: 'My App',
  group: 'general',
  type: 'string',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export function makeSettingRepo(setting: typeof mockSetting | null = mockSetting) {
  const findOne = vi.fn(async () => setting);
  const find = vi.fn(async () => (setting ? [setting] : []));
  const insert = vi.fn(async () => {});
  const update = vi.fn(async () => {});
  const del = vi.fn(async () => {});
  return { findOne, find, insert, update, delete: del };
}

export function makeDs(repo: ReturnType<typeof makeSettingRepo>) {
  return {
    getRepository: () => repo,
    // updateMany() wraps its work in a transaction; the manager exposes the
    // same repository the rest of the service uses.
    transaction: vi.fn(async (cb: (mgr: { getRepository: () => typeof repo }) => unknown) =>
      cb({ getRepository: () => repo }),
    ),
  };
}

export function setupSystemDs(setting: typeof mockSetting | null = mockSetting) {
  const repo = makeSettingRepo(setting);
  (tenantDataSourceFor as any).mockResolvedValue(makeDs(repo));
  return repo;
}
