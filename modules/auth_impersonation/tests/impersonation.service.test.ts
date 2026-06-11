import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/env', () => ({
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

vi.mock('@/modules/db', () => ({
  getDataSource: vi.fn(),
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
    incr: vi.fn(async () => 1),
    incrby: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    keys: vi.fn(async () => []),
    exists: vi.fn(async () => 0),
  },
  singleFlight: async (_key: string, fn: () => Promise<unknown>) => fn(),
  jitter: (n: number) => n,
}));

vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('@/modules/user_session/user_session.service', () => ({
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

vi.mock('@/modules/audit_log/audit_log.service', () => ({
  default: { log: vi.fn() },
}));

// Per-tenant settings — controlled per test via settingValues.
const settingValues: Record<string, string | null> = {};
vi.mock('@/modules/setting/setting.service', () => ({
  default: {
    getValue: vi.fn(async (_tenantId: string, key: string) => settingValues[key] ?? null),
  },
}));

vi.mock('@/modules/auth/auth.totp.service', () => ({
  default: { verifyAuthenticate: vi.fn(async () => ({ verified: true })) },
}));

vi.mock('@/modules/webhook/webhook.service', () => ({
  default: { dispatchEvent: vi.fn(async () => {}) },
}));

const bcryptCompare = vi.fn(async (_a?: unknown, _b?: unknown) => true);
vi.mock('bcrypt', () => ({
  default: { compare: (a: unknown, b: unknown) => bcryptCompare(a, b) },
  compare: (a: unknown, b: unknown) => bcryptCompare(a, b),
}));

import ImpersonationService from '../impersonation.service';
import redisMock from '@/modules/redis';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import ImpersonationMessages from '../impersonation.messages';
import UserSessionService from '@/modules/user_session/user_session.service';
import SettingService from '@/modules/setting/setting.service';
import WebhookService from '@/modules/webhook/webhook.service';
import TOTPService from '@/modules/auth/auth.totp.service';

const REASON = 'Support ticket #999';

const adminUser = {
  userId: 'admin-1',
  email: 'admin@example.com',
  userRole: 'ADMIN',
  userStatus: 'ACTIVE',
  emailVerifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const regularUser = {
  userId: 'user-1',
  email: 'user@example.com',
  userRole: 'USER',
  userStatus: 'ACTIVE',
  phone: null,
  emailVerifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const adminSession = {
  userSessionId: 'session-admin-1',
  userId: adminUser.userId,
  accessToken: 'hashed-admin-access',
  refreshToken: 'hashed-admin-refresh',
  sessionExpiry: new Date(Date.now() + 3600000),
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const tenantMembership = {
  tenantMemberId: 'member-1',
  tenantId: 'tenant-1',
  userId: regularUser.userId,
  memberRole: 'USER',
  deletedAt: null,
};

// System DS — `findOne` on the User repo returns the configured target;
// `password` is included so the step-up password path can be exercised.
function mockSystemDS(targetUser: any, opts: { concurrentCount?: number } = {}) {
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

function mockTenantDS(membership: typeof tenantMembership | null) {
  (tenantDataSourceFor as any).mockResolvedValue({
    getRepository: vi.fn(() => ({
      findOne: vi.fn(async () => membership),
    })),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(settingValues)) delete settingValues[k];
  bcryptCompare.mockResolvedValue(true as any);
  (redisMock.incr as any).mockResolvedValue(1);
});

describe('ImpersonationService.startSystemImpersonation', () => {
  it('throws REASON_REQUIRED when reason is blank', async () => {
    await expect(
      ImpersonationService.startSystemImpersonation({
        impersonatorUser: adminUser as any,
        impersonatorSession: adminSession as any,
        targetUserId: regularUser.userId,
        tenantId: 'tenant-1',
        reason: '  ',
      })
    ).rejects.toThrow(ImpersonationMessages.REASON_REQUIRED);
  });

  it('throws CANNOT_IMPERSONATE_SELF when impersonator targets themselves', async () => {
    await expect(
      ImpersonationService.startSystemImpersonation({
        impersonatorUser: adminUser as any,
        impersonatorSession: adminSession as any,
        targetUserId: adminUser.userId,
        tenantId: 'tenant-1',
        reason: REASON,
      })
    ).rejects.toThrow(ImpersonationMessages.CANNOT_IMPERSONATE_SELF);
  });

  it('throws TARGET_USER_NOT_FOUND when target user does not exist', async () => {
    mockSystemDS(null);
    await expect(
      ImpersonationService.startSystemImpersonation({
        impersonatorUser: adminUser as any,
        impersonatorSession: adminSession as any,
        targetUserId: 'nonexistent-user',
        tenantId: 'tenant-1',
        reason: REASON,
      })
    ).rejects.toThrow(ImpersonationMessages.TARGET_USER_NOT_FOUND);
  });

  it('throws CANNOT_IMPERSONATE_EQUAL_OR_HIGHER_GLOBAL_ROLE when admin impersonates another admin', async () => {
    const anotherAdmin = { ...regularUser, userId: 'admin-2', userRole: 'ADMIN' };
    mockSystemDS(anotherAdmin);
    await expect(
      ImpersonationService.startSystemImpersonation({
        impersonatorUser: adminUser as any,
        impersonatorSession: adminSession as any,
        targetUserId: 'admin-2',
        tenantId: 'tenant-1',
        reason: REASON,
      })
    ).rejects.toThrow(ImpersonationMessages.CANNOT_IMPERSONATE_EQUAL_OR_HIGHER_GLOBAL_ROLE);
  });

  it('throws IMPERSONATION_DISABLED_FOR_TENANT when tenant opted out', async () => {
    settingValues['impersonationDisabled'] = 'true';
    mockSystemDS(regularUser);
    await expect(
      ImpersonationService.startSystemImpersonation({
        impersonatorUser: adminUser as any,
        impersonatorSession: adminSession as any,
        targetUserId: regularUser.userId,
        tenantId: 'tenant-1',
        targetTenantRole: 'USER',
        reason: REASON,
      })
    ).rejects.toThrow(ImpersonationMessages.IMPERSONATION_DISABLED_FOR_TENANT);
  });

  it('returns session tokens on successful impersonation with explicit role', async () => {
    mockSystemDS(regularUser);

    const result = await ImpersonationService.startSystemImpersonation({
      impersonatorUser: adminUser as any,
      impersonatorSession: adminSession as any,
      targetUserId: regularUser.userId,
      tenantId: 'tenant-1',
      targetTenantRole: 'USER',
      reason: REASON,
    });

    expect(result.rawAccessToken).toBe('raw-access-token');
    expect(result.userSession).toBeDefined();
  });

  it('stores reason + a shared impersonationSessionId in the session metadata', async () => {
    mockSystemDS(regularUser);
    await ImpersonationService.startSystemImpersonation({
      impersonatorUser: adminUser as any,
      impersonatorSession: adminSession as any,
      targetUserId: regularUser.userId,
      tenantId: 'tenant-1',
      targetTenantRole: 'USER',
      reason: REASON,
    });
    expect(UserSessionService.createImpersonationSession).toHaveBeenCalledWith(
      expect.objectContaining({
        impersonationMeta: expect.objectContaining({
          reason: REASON,
          impersonationSessionId: expect.any(String),
        }),
      })
    );
  });

  it('dispatches an impersonation.started webhook', async () => {
    mockSystemDS(regularUser);
    await ImpersonationService.startSystemImpersonation({
      impersonatorUser: adminUser as any,
      impersonatorSession: adminSession as any,
      targetUserId: regularUser.userId,
      tenantId: 'tenant-1',
      targetTenantRole: 'USER',
      reason: REASON,
    });
    expect(WebhookService.dispatchEvent).toHaveBeenCalledWith(
      'tenant-1',
      'impersonation.started',
      expect.objectContaining({ targetUserId: regularUser.userId }),
    );
  });

  it('resolves target tenant role from membership when not explicitly provided', async () => {
    mockSystemDS(regularUser);
    mockTenantDS(tenantMembership);

    await ImpersonationService.startSystemImpersonation({
      impersonatorUser: adminUser as any,
      impersonatorSession: adminSession as any,
      targetUserId: regularUser.userId,
      tenantId: 'tenant-1',
      reason: REASON,
    });

    expect(UserSessionService.createImpersonationSession).toHaveBeenCalledWith(
      expect.objectContaining({
        impersonationMeta: expect.objectContaining({ targetTenantRole: 'USER' }),
      })
    );
  });
});

describe('ImpersonationService step-up re-authentication (#3)', () => {
  it('throws STEP_UP_REQUIRED when required but no credential supplied', async () => {
    settingValues['impersonationRequireStepUp'] = 'true';
    mockSystemDS({ ...regularUser, password: 'hashed-pw' });
    await expect(
      ImpersonationService.startSystemImpersonation({
        impersonatorUser: adminUser as any,
        impersonatorSession: adminSession as any,
        targetUserId: regularUser.userId,
        tenantId: 'tenant-1',
        targetTenantRole: 'USER',
        reason: REASON,
      })
    ).rejects.toThrow(ImpersonationMessages.STEP_UP_REQUIRED);
  });

  it('throws STEP_UP_INVALID_PASSWORD when password does not match', async () => {
    settingValues['impersonationRequireStepUp'] = 'true';
    bcryptCompare.mockResolvedValue(false as any);
    mockSystemDS({ ...regularUser, password: 'hashed-pw' });
    await expect(
      ImpersonationService.startSystemImpersonation({
        impersonatorUser: { ...adminUser, password: 'hashed-pw' } as any,
        impersonatorSession: adminSession as any,
        targetUserId: regularUser.userId,
        tenantId: 'tenant-1',
        targetTenantRole: 'USER',
        reason: REASON,
        stepUp: { password: 'wrong' },
      })
    ).rejects.toThrow(ImpersonationMessages.STEP_UP_INVALID_PASSWORD);
  });

  it('succeeds when step-up password matches', async () => {
    settingValues['impersonationRequireStepUp'] = 'true';
    bcryptCompare.mockResolvedValue(true as any);
    // First findOne resolves the target user, second resolves the impersonator
    // (with a password) — both come from the same repo mock, so return a row
    // that always carries a password.
    mockSystemDS({ ...regularUser, password: 'hashed-pw' });
    const result = await ImpersonationService.startSystemImpersonation({
      impersonatorUser: adminUser as any,
      impersonatorSession: adminSession as any,
      targetUserId: regularUser.userId,
      tenantId: 'tenant-1',
      targetTenantRole: 'USER',
      reason: REASON,
      stepUp: { password: 'correct' },
    });
    expect(result.rawAccessToken).toBe('raw-access-token');
  });

  it('verifies TOTP via the auth module when supplied', async () => {
    settingValues['impersonationRequireStepUp'] = 'true';
    mockSystemDS({ ...regularUser, password: 'hashed-pw' });
    await ImpersonationService.startSystemImpersonation({
      impersonatorUser: adminUser as any,
      impersonatorSession: adminSession as any,
      targetUserId: regularUser.userId,
      tenantId: 'tenant-1',
      targetTenantRole: 'USER',
      reason: REASON,
      stepUp: { totp: '123456' },
    });
    expect(TOTPService.verifyAuthenticate).toHaveBeenCalled();
  });
});

describe('ImpersonationService concurrency cap (#4)', () => {
  it('throws when the impersonator is at the per-tenant concurrency limit', async () => {
    settingValues['impersonationMaxConcurrentPerImpersonator'] = '1';
    mockSystemDS(regularUser, { concurrentCount: 1 });
    await expect(
      ImpersonationService.startSystemImpersonation({
        impersonatorUser: adminUser as any,
        impersonatorSession: adminSession as any,
        targetUserId: regularUser.userId,
        tenantId: 'tenant-1',
        targetTenantRole: 'USER',
        reason: REASON,
      })
    ).rejects.toThrow(ImpersonationMessages.IMPERSONATION_CONCURRENCY_LIMIT_REACHED);
  });

  it('allows when under the limit', async () => {
    settingValues['impersonationMaxConcurrentPerImpersonator'] = '5';
    mockSystemDS(regularUser, { concurrentCount: 2 });
    const result = await ImpersonationService.startSystemImpersonation({
      impersonatorUser: adminUser as any,
      impersonatorSession: adminSession as any,
      targetUserId: regularUser.userId,
      tenantId: 'tenant-1',
      targetTenantRole: 'USER',
      reason: REASON,
    });
    expect(result.rawAccessToken).toBe('raw-access-token');
  });
});

describe('ImpersonationService.getImpersonationTtlMs (#1)', () => {
  it('falls back to 60 minutes when unset', async () => {
    expect(await ImpersonationService.getImpersonationTtlMs('tenant-1')).toBe(60 * 60 * 1000);
  });

  it('reads the per-tenant setting in minutes', async () => {
    settingValues['impersonationSessionTtlMinutes'] = '15';
    expect(await ImpersonationService.getImpersonationTtlMs('tenant-1')).toBe(15 * 60 * 1000);
  });

  it('clamps below the minimum and falls back on invalid input', async () => {
    settingValues['impersonationSessionTtlMinutes'] = 'not-a-number';
    expect(await ImpersonationService.getImpersonationTtlMs('tenant-1')).toBe(60 * 60 * 1000);
    settingValues['impersonationSessionTtlMinutes'] = '99999';
    expect(await ImpersonationService.getImpersonationTtlMs('tenant-1')).toBe(24 * 60 * 60 * 1000);
  });
});

describe('ImpersonationService.isImpersonationDisabled (#10)', () => {
  it('returns true only when set to "true"', async () => {
    expect(await ImpersonationService.isImpersonationDisabled('tenant-1')).toBe(false);
    settingValues['impersonationDisabled'] = 'true';
    expect(await ImpersonationService.isImpersonationDisabled('tenant-1')).toBe(true);
  });
});

describe('ImpersonationService.startTenantImpersonation', () => {
  const ownerMember = {
    userId: adminUser.userId,
    tenantId: 'tenant-1',
    memberRole: 'OWNER',
    deletedAt: null,
  };

  it('throws CANNOT_IMPERSONATE_SELF', async () => {
    await expect(
      ImpersonationService.startTenantImpersonation({
        impersonatorUser: adminUser as any,
        impersonatorMember: ownerMember as any,
        impersonatorSession: adminSession as any,
        targetUserId: adminUser.userId,
        tenantId: 'tenant-1',
        reason: REASON,
      })
    ).rejects.toThrow(ImpersonationMessages.CANNOT_IMPERSONATE_SELF);
  });

  it('throws generic TARGET_NOT_FOUND when user does not exist (no enumeration)', async () => {
    mockSystemDS(null);
    await expect(
      ImpersonationService.startTenantImpersonation({
        impersonatorUser: adminUser as any,
        impersonatorMember: ownerMember as any,
        impersonatorSession: adminSession as any,
        targetUserId: 'ghost-user',
        tenantId: 'tenant-1',
        reason: REASON,
      })
    ).rejects.toThrow(ImpersonationMessages.TARGET_NOT_FOUND);
  });

  it('throws generic TARGET_NOT_FOUND when target is not a member of this tenant (#8)', async () => {
    mockSystemDS(regularUser);
    mockTenantDS(null);
    await expect(
      ImpersonationService.startTenantImpersonation({
        impersonatorUser: adminUser as any,
        impersonatorMember: ownerMember as any,
        impersonatorSession: adminSession as any,
        targetUserId: regularUser.userId,
        tenantId: 'tenant-1',
        reason: REASON,
      })
    ).rejects.toThrow(ImpersonationMessages.TARGET_NOT_FOUND);
  });

  it('throws TARGET_MUST_BE_TENANT_USER when target has ADMIN role in tenant', async () => {
    mockSystemDS(regularUser);
    mockTenantDS({ ...tenantMembership, memberRole: 'ADMIN' });
    await expect(
      ImpersonationService.startTenantImpersonation({
        impersonatorUser: adminUser as any,
        impersonatorMember: ownerMember as any,
        impersonatorSession: adminSession as any,
        targetUserId: regularUser.userId,
        tenantId: 'tenant-1',
        reason: REASON,
      })
    ).rejects.toThrow(ImpersonationMessages.TARGET_MUST_BE_TENANT_USER);
  });

  it('returns session tokens on successful tenant impersonation', async () => {
    mockSystemDS(regularUser);
    mockTenantDS(tenantMembership);

    const result = await ImpersonationService.startTenantImpersonation({
      impersonatorUser: adminUser as any,
      impersonatorMember: ownerMember as any,
      impersonatorSession: adminSession as any,
      targetUserId: regularUser.userId,
      tenantId: 'tenant-1',
      reason: REASON,
    });

    expect(result.rawAccessToken).toBe('raw-access-token');
  });
});

describe('ImpersonationService.endImpersonationSession', () => {
  it('deletes the session and records duration on END (#11)', async () => {
    const AuditLogService = (await import('@/modules/audit_log/audit_log.service')).default;
    const startedAtMs = Date.now() - 5000;
    await expect(
      ImpersonationService.endImpersonationSession('session-impersonated-1', {
        actorId: adminUser.userId,
        targetUserId: regularUser.userId,
        tenantId: 'tenant-1',
        impersonationSessionId: 'imp-1',
        startedAtMs,
      })
    ).resolves.not.toThrow();

    expect(UserSessionService.deleteSession).toHaveBeenCalledWith('session-impersonated-1');
    expect(AuditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'impersonation.ended',
        metadata: expect.objectContaining({
          impersonationSessionId: 'imp-1',
          durationMs: expect.any(Number),
        }),
      })
    );
    expect(WebhookService.dispatchEvent).toHaveBeenCalledWith(
      'tenant-1',
      'impersonation.ended',
      expect.objectContaining({ impersonationSessionId: 'imp-1' }),
    );
  });

  it('does not call audit log when actorId is not provided', async () => {
    const AuditLogService = (await import('@/modules/audit_log/audit_log.service')).default;
    await ImpersonationService.endImpersonationSession('session-impersonated-1');
    expect(AuditLogService.log).not.toHaveBeenCalled();
  });
});
