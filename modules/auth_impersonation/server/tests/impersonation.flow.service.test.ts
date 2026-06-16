import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetImpersonationMocks,
  adminUser,
  regularUser,
  adminSession,
  tenantMembership,
  mockSystemDS,
  mockTenantDS,
} from './impersonation.test-setup';
import ImpersonationService from '../impersonation.service';
import ImpersonationMessages from '../impersonation.messages';
import UserSessionService from '@nb/user_session/server/user_session.service';
import WebhookService from '@nb/webhook/server/webhook.service';

const REASON = 'Support ticket #999';

beforeEach(resetImpersonationMocks);

describe('ImpersonationService.startSystemImpersonation', () => {
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
