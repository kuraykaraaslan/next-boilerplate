import 'reflect-metadata';
import { IsNull } from 'typeorm';
import { getSystemDataSource, tenantDataSourceFor } from '@/libs/typeorm';
import { User as UserEntity } from '../user/entities/user.entity';
import { UserSession as UserSessionEntity } from '../user_session/entities/user_session.entity';
import { TenantMember as TenantMemberEntity } from '../tenant_member/entities/tenant_member.entity';
import { SafeUser } from '@/modules/user/user.types';
import { SafeUserSession, SafeUserSessionSchema } from '@/modules/user_session/user_session.types';
import UserSessionService from '@/modules/user_session/user_session.service';
import { SafeTenantMember } from '@/modules/tenant_member/tenant_member.types';
import type { TenantMemberRole } from '@/modules/tenant_member/tenant_member.enums';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { AuditActions } from '@/modules/audit_log/audit_log.enums';
import ImpersonationMessages from './impersonation.messages';

const GLOBAL_ROLE_ORDER: Record<string, number> = { USER: 0, ADMIN: 1 };

export default class ImpersonationService {

  static async startSystemImpersonation({
    impersonatorUser,
    impersonatorSession,
    targetUserId,
    tenantId,
    targetTenantRole,
    userAgent,
    ipAddress,
  }: {
    impersonatorUser: SafeUser;
    impersonatorSession: SafeUserSession;
    targetUserId: string;
    tenantId: string;
    targetTenantRole?: TenantMemberRole;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{
    userSession: SafeUserSession;
    rawAccessToken: string;
    rawRefreshToken: string;
  }> {
    this.assertNotSelf(impersonatorUser.userId, targetUserId);

    const sysDs = await getSystemDataSource();
    const targetUser = await sysDs.getRepository(UserEntity).findOne({ where: { userId: targetUserId } });
    if (!targetUser) throw new Error(ImpersonationMessages.TARGET_USER_NOT_FOUND);

    this.assertGlobalRoleDominance(impersonatorUser.userRole, targetUser.userRole);

    let resolvedRole = targetTenantRole;
    if (!resolvedRole) {
      const ds = await tenantDataSourceFor(tenantId);
      const membership = await ds.getRepository(TenantMemberEntity).findOne({
        where: { tenantId, userId: targetUserId, deletedAt: IsNull() },
      });
      resolvedRole = (membership?.memberRole as TenantMemberRole | undefined) ?? 'USER';
    }

    const result = await UserSessionService.createImpersonationSession({
      targetUser: {
        userId: targetUser.userId,
        email: targetUser.email,
        emailVerifiedAt: targetUser.emailVerifiedAt ?? null,
        phone: targetUser.phone ?? null,
        userRole: targetUser.userRole as any,
        userStatus: targetUser.userStatus as any,
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt,
      },
      impersonationMeta: {
        impersonatorUserId: impersonatorUser.userId,
        impersonatorSessionId: impersonatorSession.userSessionId,
        tenantId,
        targetTenantRole: resolvedRole,
      },
      userAgent,
      ipAddress,
    });

    AuditLogService.log({
      actorType: 'USER',
      actorId: impersonatorUser.userId,
      action: AuditActions.IMPERSONATION_STARTED,
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: { tenantId, targetTenantRole: resolvedRole, flow: 'system', ipAddress, userAgent },
    });

    return result;
  }

  static async startTenantImpersonation({
    impersonatorUser,
    impersonatorMember,
    impersonatorSession,
    targetUserId,
    tenantId,
    userAgent,
    ipAddress,
  }: {
    impersonatorUser: SafeUser;
    impersonatorMember: SafeTenantMember;
    impersonatorSession: SafeUserSession;
    targetUserId: string;
    tenantId: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{
    userSession: SafeUserSession;
    rawAccessToken: string;
    rawRefreshToken: string;
  }> {
    this.assertNotSelf(impersonatorUser.userId, targetUserId);

    const sysDs = await getSystemDataSource();
    const targetUser = await sysDs.getRepository(UserEntity).findOne({ where: { userId: targetUserId } });
    if (!targetUser) throw new Error(ImpersonationMessages.TARGET_USER_NOT_FOUND);

    const ds = await tenantDataSourceFor(tenantId);
    const targetMembership = await ds.getRepository(TenantMemberEntity).findOne({
      where: { tenantId, userId: targetUserId, deletedAt: IsNull() },
    });
    if (!targetMembership) throw new Error(ImpersonationMessages.TARGET_NOT_MEMBER_OF_TENANT);

    if (targetMembership.memberRole !== 'USER') {
      throw new Error(ImpersonationMessages.TARGET_MUST_BE_TENANT_USER);
    }

    const result = await UserSessionService.createImpersonationSession({
      targetUser: {
        userId: targetUser.userId,
        email: targetUser.email,
        emailVerifiedAt: targetUser.emailVerifiedAt ?? null,
        phone: targetUser.phone ?? null,
        userRole: targetUser.userRole as any,
        userStatus: targetUser.userStatus as any,
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt,
      },
      impersonationMeta: {
        impersonatorUserId: impersonatorUser.userId,
        impersonatorSessionId: impersonatorSession.userSessionId,
        tenantId,
        targetTenantRole: 'USER',
      },
      userAgent,
      ipAddress,
    });

    AuditLogService.log({
      actorType: 'USER',
      actorId: impersonatorUser.userId,
      action: AuditActions.IMPERSONATION_STARTED,
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: { tenantId, targetTenantRole: 'USER', flow: 'tenant', ipAddress, userAgent },
    });

    return result;
  }

  static async endImpersonationSession(
    userSessionId: string,
    context?: { actorId?: string; targetUserId?: string; tenantId?: string }
  ): Promise<void> {
    await UserSessionService.deleteSession(userSessionId);

    if (context?.actorId) {
      AuditLogService.log({
        actorType: 'USER',
        actorId: context.actorId,
        action: AuditActions.IMPERSONATION_ENDED,
        resourceType: 'user',
        resourceId: context.targetUserId,
        metadata: { tenantId: context.tenantId },
      });
    }
  }

  static async getActiveImpersonationSession(rawAccessToken: string): Promise<SafeUserSession | null> {
    const hashedToken = UserSessionService.hashToken(rawAccessToken);
    const ds = await getSystemDataSource();
    const session = await ds.getRepository(UserSessionEntity).findOne({
      where: { accessToken: hashedToken },
    });

    if (!session) return null;
    if (!(session.metadata as any)?.impersonation) return null;
    if (session.sessionExpiry < new Date()) return null;

    return SafeUserSessionSchema.parse(session);
  }

  private static assertNotSelf(impersonatorUserId: string, targetUserId: string): void {
    if (impersonatorUserId === targetUserId) {
      throw new Error(ImpersonationMessages.CANNOT_IMPERSONATE_SELF);
    }
  }

  private static assertGlobalRoleDominance(impersonatorRole: string, targetRole: string): void {
    const impersonatorIndex = GLOBAL_ROLE_ORDER[impersonatorRole] ?? 0;
    const targetIndex = GLOBAL_ROLE_ORDER[targetRole] ?? 0;
    if (impersonatorIndex <= targetIndex) {
      throw new Error(ImpersonationMessages.CANNOT_IMPERSONATE_EQUAL_OR_HIGHER_GLOBAL_ROLE);
    }
  }
}
