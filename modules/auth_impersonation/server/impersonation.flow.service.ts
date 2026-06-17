import { IsNull } from 'typeorm';
import { getDataSource, tenantDataSourceFor } from '@kuraykaraaslan/db';
import { User as UserEntity } from '@kuraykaraaslan/user/server/entities/user.entity';
import { TenantMember as TenantMemberEntity } from '@kuraykaraaslan/tenant_member/server/entities/tenant_member.entity';
import { SafeUserSchema } from '@kuraykaraaslan/user/server/user.types';
import type { SafeUserSession } from '@kuraykaraaslan/user_session/server/user_session.types';
import type { SafeTenantMember } from '@kuraykaraaslan/tenant_member/server/tenant_member.types';
import type { TenantMemberRole } from '@kuraykaraaslan/tenant_member/server/tenant_member.enums';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import ImpersonationMessages from './impersonation.messages';
import type { StepUpCredentialInput } from './impersonation.dto';
import {
  assertConcurrencyBudget,
  assertGlobalRoleDominance,
  assertNotSelf,
  assertReason,
  assertTenantAllowsImpersonation,
  enforceStepUp,
} from './impersonation.guards';
import { mintAndAudit, type ImpersonationSessionResult } from './impersonation.mint.service';

export interface StartSystemImpersonationParams {
  impersonatorUser: ReturnType<typeof SafeUserSchema.parse>;
  impersonatorSession: SafeUserSession;
  targetUserId: string;
  tenantId: string;
  targetTenantRole?: TenantMemberRole;
  reason: string;
  stepUp?: StepUpCredentialInput;
  userAgent?: string;
  ipAddress?: string;
}

export interface StartTenantImpersonationParams {
  impersonatorUser: ReturnType<typeof SafeUserSchema.parse>;
  impersonatorMember: SafeTenantMember;
  impersonatorSession: SafeUserSession;
  targetUserId: string;
  tenantId: string;
  reason: string;
  stepUp?: StepUpCredentialInput;
  userAgent?: string;
  ipAddress?: string;
}

export async function startSystemImpersonation({
  impersonatorUser,
  impersonatorSession,
  targetUserId,
  tenantId,
  targetTenantRole,
  reason,
  stepUp,
  userAgent,
  ipAddress,
}: StartSystemImpersonationParams): Promise<ImpersonationSessionResult> {
  assertReason(reason);
  assertNotSelf(impersonatorUser.userId, targetUserId);

  // GOODTOHAVE #10 — tenant opt-out blocks every flow, including system.
  await assertTenantAllowsImpersonation(tenantId);

  const sysDs = await getDataSource();
  const targetUser = await sysDs.getRepository(UserEntity).findOne({ where: { userId: targetUserId } });
  if (!targetUser) throw new AppError(ImpersonationMessages.TARGET_USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  assertGlobalRoleDominance(impersonatorUser.userRole, targetUser.userRole);

  // GOODTOHAVE #3 — step-up re-auth before a privileged action.
  await enforceStepUp({ impersonatorUser, tenantId, stepUp });

  // GOODTOHAVE #4 — per-impersonator concurrency cap.
  await assertConcurrencyBudget(impersonatorUser.userId, tenantId);

  let resolvedRole = targetTenantRole;
  if (!resolvedRole) {
    const ds = await tenantDataSourceFor(tenantId);
    const membership = await ds.getRepository(TenantMemberEntity).findOne({
      where: { tenantId, userId: targetUserId, deletedAt: IsNull() },
    });
    resolvedRole = (membership?.memberRole as TenantMemberRole | undefined) ?? 'USER';
  }

  const safeTargetUser = SafeUserSchema.parse(targetUser);

  return mintAndAudit({
    impersonatorUser,
    impersonatorSession,
    safeTargetUser,
    targetUserId,
    tenantId,
    resolvedRole,
    flow: 'system',
    reason,
    userAgent,
    ipAddress,
  });
}

export async function startTenantImpersonation({
  impersonatorUser,
  impersonatorSession,
  targetUserId,
  tenantId,
  reason,
  stepUp,
  userAgent,
  ipAddress,
}: StartTenantImpersonationParams): Promise<ImpersonationSessionResult> {
  assertReason(reason);
  assertNotSelf(impersonatorUser.userId, targetUserId);

  // GOODTOHAVE #10 — tenant opt-out.
  await assertTenantAllowsImpersonation(tenantId);

  const sysDs = await getDataSource();
  const targetUser = await sysDs.getRepository(UserEntity).findOne({ where: { userId: targetUserId } });
  // GOODTOHAVE #8 — generic not-found: do NOT distinguish "user does not exist"
  // from "user exists but is not a member of this tenant", to close
  // cross-tenant user enumeration via the tenant flow.
  if (!targetUser) throw new AppError(ImpersonationMessages.TARGET_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  const ds = await tenantDataSourceFor(tenantId);
  const targetMembership = await ds.getRepository(TenantMemberEntity).findOne({
    where: { tenantId, userId: targetUserId, deletedAt: IsNull() },
  });
  if (!targetMembership) throw new AppError(ImpersonationMessages.TARGET_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  if (targetMembership.memberRole !== 'USER') {
    throw new AppError(ImpersonationMessages.TARGET_MUST_BE_TENANT_USER, 403, ErrorCode.FORBIDDEN);
  }

  // GOODTOHAVE #3 — step-up re-auth.
  await enforceStepUp({ impersonatorUser, tenantId, stepUp });

  // GOODTOHAVE #4 — per-impersonator concurrency cap.
  await assertConcurrencyBudget(impersonatorUser.userId, tenantId);

  const safeTargetUser = SafeUserSchema.parse(targetUser);

  return mintAndAudit({
    impersonatorUser,
    impersonatorSession,
    safeTargetUser,
    targetUserId,
    tenantId,
    resolvedRole: 'USER',
    flow: 'tenant',
    reason,
    userAgent,
    ipAddress,
  });
}
