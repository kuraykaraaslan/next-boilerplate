import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
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

vi.mock('@/libs/typeorm', () => ({
  getSystemDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/libs/redis', () => ({
  default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() },
}));

vi.mock('@/libs/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

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

import ImpersonationService from './impersonation.service';
import { getSystemDataSource, tenantDataSourceFor } from '@/libs/typeorm';
import ImpersonationMessages from './impersonation.messages';
import UserSessionService from '@/modules/user_session/user_session.service';

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

function mockSystemDS(targetUser: typeof regularUser | null) {
  (getSystemDataSource as any).mockResolvedValue({
    getRepository: vi.fn(() => ({
      findOne: vi.fn(async () => targetUser),
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
});

describe('ImpersonationService.startSystemImpersonation', () => {
  it('throws CANNOT_IMPERSONATE_SELF when impersonator targets themselves', async () => {
    await expect(
      ImpersonationService.startSystemImpersonation({
        impersonatorUser: adminUser as any,
        impersonatorSession: adminSession as any,
        targetUserId: adminUser.userId,
        tenantId: 'tenant-1',
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
      })
    ).rejects.toThrow(ImpersonationMessages.TARGET_USER_NOT_FOUND);
  });

  it('throws CANNOT_IMPERSONATE_EQUAL_OR_HIGHER_GLOBAL_ROLE when admin tries to impersonate another admin', async () => {
    const anotherAdmin = { ...regularUser, userId: 'admin-2', userRole: 'ADMIN' };
    mockSystemDS(anotherAdmin);
    await expect(
      ImpersonationService.startSystemImpersonation({
        impersonatorUser: adminUser as any,
        impersonatorSession: adminSession as any,
        targetUserId: 'admin-2',
        tenantId: 'tenant-1',
      })
    ).rejects.toThrow(ImpersonationMessages.CANNOT_IMPERSONATE_EQUAL_OR_HIGHER_GLOBAL_ROLE);
  });

  it('returns session tokens on successful impersonation with explicit role', async () => {
    mockSystemDS(regularUser);

    const result = await ImpersonationService.startSystemImpersonation({
      impersonatorUser: adminUser as any,
      impersonatorSession: adminSession as any,
      targetUserId: regularUser.userId,
      tenantId: 'tenant-1',
      targetTenantRole: 'USER',
    });

    expect(result.rawAccessToken).toBe('raw-access-token');
    expect(result.rawRefreshToken).toBe('raw-refresh-token');
    expect(result.userSession).toBeDefined();
  });

  it('resolves target tenant role from membership when not explicitly provided', async () => {
    mockSystemDS(regularUser);
    mockTenantDS(tenantMembership);

    const result = await ImpersonationService.startSystemImpersonation({
      impersonatorUser: adminUser as any,
      impersonatorSession: adminSession as any,
      targetUserId: regularUser.userId,
      tenantId: 'tenant-1',
    });

    expect(result.rawAccessToken).toBe('raw-access-token');
    expect(UserSessionService.createImpersonationSession).toHaveBeenCalledWith(
      expect.objectContaining({
        impersonationMeta: expect.objectContaining({ targetTenantRole: 'USER' }),
      })
    );
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
      })
    ).rejects.toThrow(ImpersonationMessages.CANNOT_IMPERSONATE_SELF);
  });

  it('throws TARGET_USER_NOT_FOUND when user does not exist in system', async () => {
    mockSystemDS(null);
    await expect(
      ImpersonationService.startTenantImpersonation({
        impersonatorUser: adminUser as any,
        impersonatorMember: ownerMember as any,
        impersonatorSession: adminSession as any,
        targetUserId: 'ghost-user',
        tenantId: 'tenant-1',
      })
    ).rejects.toThrow(ImpersonationMessages.TARGET_USER_NOT_FOUND);
  });

  it('throws TARGET_NOT_MEMBER_OF_TENANT when target is not in the tenant', async () => {
    mockSystemDS(regularUser);
    mockTenantDS(null);
    await expect(
      ImpersonationService.startTenantImpersonation({
        impersonatorUser: adminUser as any,
        impersonatorMember: ownerMember as any,
        impersonatorSession: adminSession as any,
        targetUserId: regularUser.userId,
        tenantId: 'tenant-1',
      })
    ).rejects.toThrow(ImpersonationMessages.TARGET_NOT_MEMBER_OF_TENANT);
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
    });

    expect(result.rawAccessToken).toBe('raw-access-token');
  });
});

describe('ImpersonationService.endImpersonationSession', () => {
  it('deletes the session without throwing', async () => {
    await expect(
      ImpersonationService.endImpersonationSession('session-impersonated-1', {
        actorId: adminUser.userId,
        targetUserId: regularUser.userId,
        tenantId: 'tenant-1',
      })
    ).resolves.not.toThrow();

    expect(UserSessionService.deleteSession).toHaveBeenCalledWith('session-impersonated-1');
  });

  it('does not call audit log when actorId is not provided', async () => {
    const AuditLogService = (await import('@/modules/audit_log/audit_log.service')).default;
    await ImpersonationService.endImpersonationSession('session-impersonated-1');
    expect(AuditLogService.log).not.toHaveBeenCalled();
  });
});
