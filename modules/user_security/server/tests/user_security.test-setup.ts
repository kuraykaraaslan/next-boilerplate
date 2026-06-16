import { vi } from 'vitest';

vi.mock('@nb/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@nb/db', () => ({
  getDataSource: vi.fn(),
}));

vi.mock('@nb/redis', () => ({
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
  jitter: (n: number) => n,
  singleFlight: async (_key: string, fn: () => Promise<any>) => fn(),
}));
vi.mock('@nb/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { getDataSource } from '@nb/db';

export const mockSecurityEntity = {
  userId: 'user-1',
  otpMethods: [] as string[],
  otpSecret: null as string | null,
  otpBackupCodes: [] as string[],
  lastLoginAt: null as Date | null,
  lastLoginIp: null as string | null,
  lastLoginDevice: null as string | null,
  failedLoginAttempts: 0,
  lockedUntil: null as Date | null,
  passkeyEnabled: false,
  passkeys: [] as any[],
};

export function buildRepoMock(overrides: Record<string, any> = {}) {
  const findOne = vi.fn(async () => null as typeof mockSecurityEntity | null);
  const save = vi.fn(async (data: any) => ({ ...mockSecurityEntity, ...data }));
  const create = vi.fn((data: any) => ({ ...mockSecurityEntity, ...data }));
  const update = vi.fn(async () => ({ affected: 1 }));
  const del = vi.fn(async () => undefined);

  const repo = { findOne, save, create, update, delete: del, ...overrides };

  (getDataSource as any).mockResolvedValue({
    getRepository: () => repo,
  });

  return repo;
}
