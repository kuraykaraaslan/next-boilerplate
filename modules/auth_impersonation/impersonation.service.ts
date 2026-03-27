import { systemPrisma, tenantPrismaFor } from "@/libs/prisma";
import { SafeUser } from "@/modules/user/user.types";
import { SafeUserSession, SafeUserSessionSchema } from "@/modules/user_session/user_session.types";
import UserSessionService from "@/modules/user_session/user_session.service";
import { SafeTenantMember } from "@/modules/tenant_member/tenant_member.types";
import type { TenantMemberRole } from "@/modules/tenant_member/tenant_member.enums";
import AuditLogService from "@/modules/audit_log/audit_log.service";
import { AuditActions } from "@/modules/audit_log/audit_log.enums";
import ImpersonationMessages from "./impersonation.messages";

const GLOBAL_ROLE_ORDER: Record<string, number> = { USER: 0, ADMIN: 1 };

export default class ImpersonationService {

  /**
   * Flow 1: System ADMIN impersonates any user in a specific tenant.
   * targetTenantRole defaults to the target's actual membership role (or 'USER').
   */
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

    const targetUser = await systemPrisma.user.findUnique({ where: { userId: targetUserId } });
    if (!targetUser) throw new Error(ImpersonationMessages.TARGET_USER_NOT_FOUND);

    this.assertGlobalRoleDominance(impersonatorUser.userRole, targetUser.userRole);

    // Resolve role to assume in the tenant
    let resolvedRole = targetTenantRole;
    if (!resolvedRole) {
      const db = await tenantPrismaFor(tenantId);
      const membership = await db.tenantMember.findFirst({
        where: { tenantId, userId: targetUserId, deletedAt: null },
      });
      resolvedRole = (membership?.memberRole as TenantMemberRole | undefined) ?? "USER";
    }

    const result = await UserSessionService.createImpersonationSession({
      targetUser: {
        userId: targetUser.userId,
        email: targetUser.email,
        emailVerifiedAt: targetUser.emailVerifiedAt,
        phone: targetUser.phone,
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
      actorType: "USER",
      actorId: impersonatorUser.userId,
      action: AuditActions.IMPERSONATION_STARTED,
      resourceType: "user",
      resourceId: targetUserId,
      metadata: { tenantId, targetTenantRole: resolvedRole, flow: "system", ipAddress, userAgent },
    });

    return result;
  }

  /**
   * Flow 2: Tenant OWNER or ADMIN impersonates a tenant USER.
   * Target must have memberRole === 'USER'.
   */
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

    const targetUser = await systemPrisma.user.findUnique({ where: { userId: targetUserId } });
    if (!targetUser) throw new Error(ImpersonationMessages.TARGET_USER_NOT_FOUND);

    const db = await tenantPrismaFor(tenantId);
    const targetMembership = await db.tenantMember.findFirst({
      where: { tenantId, userId: targetUserId, deletedAt: null },
    });
    if (!targetMembership) throw new Error(ImpersonationMessages.TARGET_NOT_MEMBER_OF_TENANT);

    if (targetMembership.memberRole !== "USER") {
      throw new Error(ImpersonationMessages.TARGET_MUST_BE_TENANT_USER);
    }

    const result = await UserSessionService.createImpersonationSession({
      targetUser: {
        userId: targetUser.userId,
        email: targetUser.email,
        emailVerifiedAt: targetUser.emailVerifiedAt,
        phone: targetUser.phone,
        userRole: targetUser.userRole as any,
        userStatus: targetUser.userStatus as any,
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt,
      },
      impersonationMeta: {
        impersonatorUserId: impersonatorUser.userId,
        impersonatorSessionId: impersonatorSession.userSessionId,
        tenantId,
        targetTenantRole: "USER",
      },
      userAgent,
      ipAddress,
    });

    AuditLogService.log({
      actorType: "USER",
      actorId: impersonatorUser.userId,
      action: AuditActions.IMPERSONATION_STARTED,
      resourceType: "user",
      resourceId: targetUserId,
      metadata: { tenantId, targetTenantRole: "USER", flow: "tenant", ipAddress, userAgent },
    });

    return result;
  }

  /**
   * End an active impersonation session.
   */
  static async endImpersonationSession(
    userSessionId: string,
    context?: { actorId?: string; targetUserId?: string; tenantId?: string }
  ): Promise<void> {
    await UserSessionService.deleteSession(userSessionId);

    if (context?.actorId) {
      AuditLogService.log({
        actorType: "USER",
        actorId: context.actorId,
        action: AuditActions.IMPERSONATION_ENDED,
        resourceType: "user",
        resourceId: context.targetUserId,
        metadata: { tenantId: context.tenantId },
      });
    }
  }

  /**
   * Get an active impersonation session by raw access token. Returns null if not found or not impersonation.
   */
  static async getActiveImpersonationSession(rawAccessToken: string): Promise<SafeUserSession | null> {
    const hashedToken = UserSessionService.hashToken(rawAccessToken);
    const session = await systemPrisma.userSession.findFirst({
      where: { accessToken: hashedToken },
    });

    if (!session) return null;
    if (!(session.metadata as any)?.impersonation) return null;
    if (session.sessionExpiry < new Date()) return null;

    return SafeUserSessionSchema.parse(session);
  }

  // ── Security guards ────────────────────────────────────────────────────

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
