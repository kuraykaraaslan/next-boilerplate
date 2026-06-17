import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthService from '../auth.service';

vi.mock('@kuraykaraaslan/env', () => ({
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

vi.mock('@kuraykaraaslan/db', () => ({
  getDataSource: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(async () => 'hashed_password'),
    compare: vi.fn(async (plain: string, _hashed: string) => plain === 'correct_password'),
  },
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
vi.mock('@kuraykaraaslan/notification_mail/server/notification_mail.service', () => ({ default: { sendEmail: vi.fn() } }));
vi.mock('@kuraykaraaslan/tenant/server/tenant.service', () => ({ default: { provisionPersonal: vi.fn() } }));
vi.mock('@kuraykaraaslan/tenant_invitation/server/tenant_invitation.service', () => ({ default: { autoAcceptForEmail: vi.fn() } }));
vi.mock('@kuraykaraaslan/user/server/user.service', () => ({ default: { getByEmail: vi.fn(async () => null), invalidate: vi.fn() } }));
vi.mock('@kuraykaraaslan/audit_log/server/audit_log.service', () => ({ default: { log: vi.fn(async () => {}) } }));
vi.mock('./auth.captcha.service', () => ({
  default: {
    isRequired: vi.fn(async () => false),
    recordFailure: vi.fn(async () => {}),
    clear: vi.fn(async () => {}),
    verify: vi.fn(async () => true),
  },
}));
vi.mock('@kuraykaraaslan/user_security/server/user_security.service', () => ({
  default: {
    isLocked: vi.fn(async () => false),
    recordLoginAttempt: vi.fn(async () => {}),
    getPasswordChangedAt: vi.fn(async () => null),
    pushPasswordHistory: vi.fn(async () => {}),
    getPasswordHistory: vi.fn(async () => []),
    getSafeByUserId: vi.fn(async () => null),
  },
}));
vi.mock('@kuraykaraaslan/observability', () => ({ default: { recordTenantUsage: vi.fn() } }));
vi.mock('@kuraykaraaslan/webhook/server/webhook.service', () => ({ default: { dispatchEvent: vi.fn(async () => {}) } }));
vi.mock('@kuraykaraaslan/auth/server/auth.policy.service', () => ({
  default: {
    getPasswordPolicy: vi.fn(async () => ({
      minLength: 8, requireUppercase: true, requireLowercase: true,
      requireDigit: true, requireSpecial: true, historyCount: 3, maxAgeDays: 42, minAgeDays: 0,
    })),
    getLockoutPolicy: vi.fn(async () => ({ maxAttempts: 5, lockDurationMinutes: 15 })),
    getSessionPolicy: vi.fn(async () => ({ absoluteMaxHours: 8, idleTimeoutMinutes: 30 })),
    getDormantPolicy: vi.fn(async () => ({ days: 90, autoDisable: true, deleteAfterDays: 0 })),
    getAccessPolicy: vi.fn(async () => ({
      externalRequireMfa: false, disableSocialLogin: false,
      captchaTriggerAttempts: 0, singleSessionOnly: false,
      allowRegistration: true, emailVerificationRequired: false,
      ssoAllowedProviders: [], mfaAllowedMethods: [],
    })),
    getAdminPolicy: vi.fn(async () => ({ ipAllowlist: [], requireMfa: true })),
    getCredentialPolicy: vi.fn(async () => ({ bcryptCost: 10 })),
    getOtpPolicy: vi.fn(async () => ({ length: 6, expirySeconds: 600, rateLimitSeconds: 60, maxAttempts: 5 })),
    getResetPolicy: vi.fn(async () => ({ tokenExpirySeconds: 3600, tokenLength: 6 })),
    getEmailVerifyPolicy: vi.fn(async () => ({ ttlSeconds: 86400, rateLimitSeconds: 300 })),
    validatePassword: vi.fn(() => null),
    isAdminIpAllowed: vi.fn(() => true),
  },
}));

import { getDataSource } from '@kuraykaraaslan/db';
import UserService from '@kuraykaraaslan/user/server/user.service';
import AuthMessages from '../auth.messages';
import AuthPolicyService from '@kuraykaraaslan/auth/server/auth.policy.service';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';
import UserSecurityService from '@kuraykaraaslan/user_security/server/user_security.service';

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

  it('blocks login when emailVerificationRequired and email is unverified (GTH-1/12)', async () => {
    mockDataSource({ ...mockUser, emailVerifiedAt: null } as any);
    (AuthPolicyService.getAccessPolicy as any).mockResolvedValueOnce({
      externalRequireMfa: false, disableSocialLogin: false, captchaTriggerAttempts: 0, singleSessionOnly: false,
      allowRegistration: true, emailVerificationRequired: true, ssoAllowedProviders: [], mfaAllowedMethods: [],
    });
    await expect(
      AuthService.login({ email: mockUser.email, password: 'correct_password' }),
    ).rejects.toThrow(AuthMessages.EMAIL_VERIFICATION_REQUIRED);
  });

  it('fires the account_locked webhook when a bad attempt crosses the threshold (GTH-18)', async () => {
    mockDataSource(mockUser);
    // First isLocked() (pre-bcrypt gate) = false, second (post bad attempt) = true.
    (UserSecurityService.isLocked as any)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    await expect(
      AuthService.login({ email: mockUser.email, password: 'wrong_password', tenantId: 't1' }),
    ).rejects.toThrow(AuthMessages.INVALID_EMAIL_OR_PASSWORD);
    expect(WebhookService.dispatchEvent).toHaveBeenCalledWith('t1', 'auth.account_locked', expect.any(Object));
  });
});

describe('AuthService.register — registration posture (GTH-1)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects registration when allowRegistration is false', async () => {
    mockDataSource(null);
    (AuthPolicyService.getAccessPolicy as any).mockResolvedValueOnce({
      externalRequireMfa: false, disableSocialLogin: false, captchaTriggerAttempts: 0, singleSessionOnly: false,
      allowRegistration: false, emailVerificationRequired: false, ssoAllowedProviders: [], mfaAllowedMethods: [],
    });
    await expect(
      AuthService.register({ email: 'new@example.com', password: 'Secur3Pass!x' }),
    ).rejects.toThrow(AuthMessages.REGISTRATION_DISABLED);
  });
});

describe('AuthService.changePassword — minimum password age (GTH-9)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a change when the password is younger than minAgeDays', async () => {
    mockDataSource(mockUser);
    (AuthPolicyService.getPasswordPolicy as any).mockResolvedValueOnce({
      minLength: 8, requireUppercase: true, requireLowercase: true, requireDigit: true,
      requireSpecial: true, historyCount: 3, maxAgeDays: 42, minAgeDays: 1,
    });
    (UserSecurityService.getPasswordChangedAt as any).mockResolvedValueOnce(new Date());
    await expect(
      AuthService.changePassword({ userId: 'user-1', newPassword: 'Brand0New!pwd' }),
    ).rejects.toThrow(AuthMessages.PASSWORD_CHANGED_TOO_RECENTLY);
  });
});
