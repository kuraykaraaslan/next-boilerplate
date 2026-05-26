import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthService from './auth.service';

vi.mock('@/modules/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    EMAIL_VERIFY_TTL_SECONDS: 86400,
    EMAIL_VERIFY_RATE_LIMIT_SECONDS: 300,
  },
}));

vi.mock('@/modules/db', () => ({
  getDataSource: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(async () => 'hashed_password'),
    compare: vi.fn(async (plain: string, _hashed: string) => plain === 'correct_password'),
  },
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
vi.mock('../notification_mail/notification_mail.service', () => ({ default: { sendEmail: vi.fn() } }));
vi.mock('../tenant/tenant.service', () => ({ default: { provisionPersonal: vi.fn() } }));
vi.mock('../tenant_invitation/tenant_invitation.service', () => ({ default: { autoAcceptForEmail: vi.fn() } }));
vi.mock('../user/user.service', () => ({ default: { getByEmail: vi.fn(async () => null), invalidate: vi.fn() } }));
vi.mock('../audit_log/audit_log.service', () => ({ default: { log: vi.fn(async () => {}) } }));
vi.mock('./auth.captcha.service', () => ({
  default: {
    isRequired: vi.fn(async () => false),
    recordFailure: vi.fn(async () => {}),
    clear: vi.fn(async () => {}),
    verify: vi.fn(async () => true),
  },
}));
vi.mock('../user_security/user_security.service', () => ({
  default: {
    isLocked: vi.fn(async () => false),
    recordLoginAttempt: vi.fn(async () => {}),
    getPasswordChangedAt: vi.fn(async () => null),
    pushPasswordHistory: vi.fn(async () => {}),
    getPasswordHistory: vi.fn(async () => []),
  },
}));
vi.mock('./auth.policy.service', () => ({
  default: {
    getPasswordPolicy: vi.fn(async () => ({
      minLength: 8, requireUppercase: true, requireLowercase: true,
      requireDigit: true, requireSpecial: true, historyCount: 3, maxAgeDays: 42,
    })),
    getLockoutPolicy: vi.fn(async () => ({ maxAttempts: 5, lockDurationMinutes: 15 })),
    getSessionPolicy: vi.fn(async () => ({ absoluteMaxHours: 8, idleTimeoutMinutes: 30 })),
    getDormantPolicy: vi.fn(async () => ({ days: 90, autoDisable: true })),
    getAccessPolicy: vi.fn(async () => ({
      externalRequireMfa: false, disableSocialLogin: false,
      captchaTriggerAttempts: 0, singleSessionOnly: false,
    })),
    getAdminPolicy: vi.fn(async () => ({ ipAllowlist: [], requireMfa: true })),
    validatePassword: vi.fn(() => null),
    isAdminIpAllowed: vi.fn(() => true),
  },
}));

import { getDataSource } from '@/modules/db';
import UserService from '../user/user.service';
import AuthMessages from './auth.messages';

const mockUser = {
  userId: 'user-1',
  email: 'user@example.com',
  password: 'hashed',
  phone: null,
  userRole: 'USER',
  userStatus: 'ACTIVE',
  emailVerifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

function mockDataSource(user: typeof mockUser | null) {
  const save = vi.fn(async (u: any) => ({ ...mockUser, ...u }));
  const findOne = vi.fn(async () => user);
  const create = vi.fn((data: any) => ({ ...mockUser, ...data }));
  const repo = { findOne, save, create };
  (getDataSource as any).mockResolvedValue({
    getRepository: () => repo,
  });
  return { findOne, save, create };
}

describe('AuthService.generateToken', () => {
  it('returns a 6-digit string', () => {
    const token = AuthService.generateToken();
    expect(token).toMatch(/^\d{6}$/);
  });
});

describe('AuthService.hashPassword', () => {
  it('returns a hashed string', async () => {
    const hash = await AuthService.hashPassword('mypassword');
    expect(hash).toBe('hashed_password');
  });
});

describe('AuthService.login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when user not found', async () => {
    mockDataSource(null);
    await expect(
      AuthService.login({ email: 'nobody@example.com', password: 'pass' })
    ).rejects.toThrow(AuthMessages.INVALID_EMAIL_OR_PASSWORD);
  });

  it('throws when password is wrong', async () => {
    mockDataSource(mockUser);
    await expect(
      AuthService.login({ email: mockUser.email, password: 'wrong_password' })
    ).rejects.toThrow(AuthMessages.INVALID_EMAIL_OR_PASSWORD);
  });

  it('returns safe user on valid credentials', async () => {
    mockDataSource(mockUser);
    const result = await AuthService.login({ email: mockUser.email, password: 'correct_password' });
    expect(result.user.email).toBe(mockUser.email);
    expect((result.user as any).password).toBeUndefined();
  });
});
