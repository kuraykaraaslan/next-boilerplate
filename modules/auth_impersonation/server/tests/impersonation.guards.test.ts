import { describe, it, expect, beforeEach } from 'vitest';
import {
  settingValues,
  resetImpersonationMocks,
  adminUser,
  regularUser,
  adminSession,
  bcryptCompare,
  mockSystemDS,
} from './impersonation.test-setup';
import ImpersonationService from '../impersonation.service';
import ImpersonationMessages from '../impersonation.messages';
import TOTPService from '@nb/auth/server/auth.totp.service';

const REASON = 'Support ticket #999';

beforeEach(resetImpersonationMocks);

describe('ImpersonationService guards — reason / self / role / tenant opt-out', () => {
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
