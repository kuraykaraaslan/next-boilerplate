import { vi } from 'vitest';

vi.mock('@kuraykaraaslan/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    REDIS_URL: 'redis://localhost:6379',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    AWS_S3_BUCKET: 'test-bucket',
    AWS_REGION: 'us-east-1',
    STRIPE_SECRET_KEY: 'sk_test_xxx',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '587',
    SMTP_USER: 'test@test.com',
    SMTP_PASS: 'test',
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
    incr: vi.fn(async () => 1),
    incrby: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    keys: vi.fn(async () => []),
    exists: vi.fn(async () => 0),
  },
  singleFlight: async (_key: string, fn: () => Promise<unknown>) => fn(),
  jitter: (n: number) => n,
}));

vi.mock('@kuraykaraaslan/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('@kuraykaraaslan/user_session/server/user_session.service', () => ({
  default: {
    createImpersonationSession: vi.fn(async () => ({
      userSession: {
        userSessionId: 'session-impersonated-1',
        userId: 'target-user-1',
        accessToken: 'hashed-access',
        refreshToken: 'hashed-refresh',
        sessionExpiry: new Date(Date.now() + 3600000),
        metadata: { impersonation: { impersonatorUserId: 'admin-1' } },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      rawAccessToken: 'raw-access-token',
      rawRefreshToken: 'raw-refresh-token',
    })),
    deleteSession: vi.fn(async () => {}),
    hashToken: vi.fn((token: string) => `hashed-${token}`),
  },
}));

vi.mock('@kuraykaraaslan/audit_log/server/audit_log.service', () => ({
  default: { log: vi.fn() },
}));

// Per-tenant settings — controlled per test via settingValues.
export const settingValues: Record<string, string | null> = {};
vi.mock('@kuraykaraaslan/setting/server/setting.service', () => ({
  default: {
    getValue: vi.fn(async (_tenantId: string, key: string) => settingValues[key] ?? null),
  },
}));

vi.mock('@kuraykaraaslan/auth/server/auth.totp.service', () => ({
  default: { verifyAuthenticate: vi.fn(async () => ({ verified: true })) },
}));

vi.mock('@kuraykaraaslan/webhook/server/webhook.service', () => ({
  default: { dispatchEvent: vi.fn(async () => {}) },
}));

export const bcryptCompare = vi.fn(async (_a?: unknown, _b?: unknown) => true);
vi.mock('bcrypt', () => ({
  default: { compare: (a: unknown, b: unknown) => bcryptCompare(a, b) },
  compare: (a: unknown, b: unknown) => bcryptCompare(a, b),
}));

// Mocked-module references re-exported so test files share one source of truth.
import redisMock from '@kuraykaraaslan/redis';
import { getDataSource, tenantDataSourceFor } from '@kuraykaraaslan/db';
import UserSessionService from '@kuraykaraaslan/user_session/server/user_session.service';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';
import TOTPService from '@kuraykaraaslan/auth/server/auth.totp.service';
export { redisMock, getDataSource, tenantDataSourceFor, UserSessionService, WebhookService, TOTPService };

export const REASON = 'Support ticket #999';

export const adminUser = {
  userId: 'admin-1',
  email: 'admin@example.com',
  userRole: 'ADMIN',
  userStatus: 'ACTIVE',
  emailVerifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const regularUser = {
  userId: 'user-1',
  email: 'user@example.com',
  userRole: 'USER',
  userStatus: 'ACTIVE',
  phone: null,
  emailVerifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const adminSession = {
  userSessionId: 'session-admin-1',
  userId: adminUser.userId,
  accessToken: 'hashed-admin-access',
  refreshToken: 'hashed-admin-refresh',
  sessionExpiry: new Date(Date.now() + 3600000),
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const tenantMembership = {
  tenantMemberId: 'member-1',
  tenantId: 'tenant-1',
  userId: regularUser.userId,
  memberRole: 'USER',
  deletedAt: null,
};

// System DS — `findOne` on the User repo returns the configured target;
// `password` is included so the step-up password path can be exercised.
export function mockSystemDS(targetUser: any, opts: { concurrentCount?: number } = {}) {
  (getDataSource as any).mockResolvedValue({
    getRepository: vi.fn(() => ({
      findOne: vi.fn(async () => targetUser),
      createQueryBuilder: vi.fn(() => {
        const qb: any = {
          where: () => qb,
          andWhere: () => qb,
          getCount: async () => opts.concurrentCount ?? 0,
        };
        return qb;
      }),
    })),
  });
}

export function mockTenantDS(membership: typeof tenantMembership | null) {
  (tenantDataSourceFor as any).mockResolvedValue({
    getRepository: vi.fn(() => ({
      findOne: vi.fn(async () => membership),
    })),
  });
}

// Shared beforeEach reset — clears mocks + per-test setting overrides.
export function resetImpersonationMocks() {
  vi.clearAllMocks();
  for (const k of Object.keys(settingValues)) delete settingValues[k];
  bcryptCompare.mockResolvedValue(true as any);
  (redisMock.incr as any).mockResolvedValue(1);
}
