import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetImpersonationMocks,
  adminUser,
  regularUser,
} from './impersonation.test-setup';
import ImpersonationService from '../impersonation.service';
import UserSessionService from '@/modules/user_session/user_session.service';
import WebhookService from '@/modules/webhook/webhook.service';

beforeEach(resetImpersonationMocks);

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
