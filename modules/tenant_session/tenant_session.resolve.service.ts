import 'reflect-metadata';
import { IsNull } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { TenantMember as TenantMemberEntity } from '@/modules/tenant_member/entities/tenant_member.entity';
import redis, { jitter, singleFlight } from '@/modules/redis';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import Logger from '@/modules/logger';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { SafeTenant } from '@/modules/tenant/tenant.types';
import { SafeTenantMember } from '@/modules/tenant_member/tenant_member.types';
import { SafeUser } from '@/modules/user/user.types';
import TenantAuthMessages from './tenant_session.messages';
import type { TenantMemberRole } from '@/modules/tenant_member/tenant_member.enums';
import type { TenantSessionRequestContext } from './tenant_session.types';
import {
  hasRequiredRole, getTenantById, getTenantMembership,
  validateTenantStatus, validateMemberStatus,
} from './tenant_session.membership';
import {
  resolveSessionTtl, assertCircuitClosed, assertIpAllowed, assert2faSatisfied,
  assertConcurrentLimit, checkGeoAnomaly, recordAuthFailure,
} from './tenant_session.policy';

export async function authenticateTenantMembership({ user, tenantId, requiredRole = 'USER', context }: {
  user: SafeUser;
  tenantId: string;
  requiredRole?: TenantMemberRole;
  context?: TenantSessionRequestContext;
}): Promise<{ tenant: SafeTenant; tenantMember: SafeTenantMember }> {
  // Per-tenant security gates that don't need the membership row run first so
  // a blocked IP / unsatisfied 2FA never touches the DB.
  if (context) {
    await assertCircuitClosed(tenantId);
    await assertIpAllowed(tenantId, context.ip);
    await assert2faSatisfied(tenantId, context);
  }

  const cacheKey = `tenant:member:${user.userId}:${tenantId}`;
  const cached = await redis.get(cacheKey).catch(() => null);

  if (cached) {
    try {
      const cachedData = JSON.parse(cached);
      if (cachedData?.tenant && cachedData?.tenantMember) {
        const ds = await tenantDataSourceFor(tenantId);
        const dbMember = await ds.getRepository(TenantMemberEntity)
          .findOne({ where: { tenantId, userId: user.userId, deletedAt: IsNull() }, select: { sessionVersion: true } });
        if (!dbMember || dbMember.sessionVersion !== cachedData.tenantMember.sessionVersion) {
          await redis.del(cacheKey).catch(() => {});
        } else {
          if (!hasRequiredRole(cachedData.tenantMember.memberRole, requiredRole)) {
            await auditDenial(tenantId, user.userId, requiredRole, context, 'insufficient_role');
            throw new AppError(TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS, 403, ErrorCode.FORBIDDEN);
          }
          await postResolveChecks(tenantId, user, cachedData.tenantMember, context);
          return { tenant: cachedData.tenant, tenantMember: cachedData.tenantMember };
        }
      }
    } catch (e: unknown) {
      if (e instanceof AppError) throw e;
      await redis.del(cacheKey).catch(() => {});
    }
  }

  return singleFlight(cacheKey, async () => {
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      await recordAuthFailure(tenantId);
      throw new AppError(TenantAuthMessages.TENANT_NOT_FOUND, 404, ErrorCode.TENANT_NOT_FOUND);
    }
    validateTenantStatus(tenant);

    const tenantMember = await getTenantMembership(tenantId, user.userId);
    if (!tenantMember) {
      await recordAuthFailure(tenantId);
      await auditDenial(tenantId, user.userId, requiredRole, context, 'not_member');
      throw new AppError(TenantAuthMessages.USER_NOT_MEMBER_OF_TENANT, 403, ErrorCode.NOT_TENANT_MEMBER);
    }
    validateMemberStatus(tenantMember);

    if (!hasRequiredRole(tenantMember.memberRole, requiredRole)) {
      await recordAuthFailure(tenantId);
      await auditDenial(tenantId, user.userId, requiredRole, context, 'insufficient_role');
      throw new AppError(TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS, 403, ErrorCode.FORBIDDEN);
    }

    const ttl = await resolveSessionTtl(tenantId);
    await redis.setex(cacheKey, jitter(ttl), JSON.stringify({ tenant, tenantMember })).catch(() => {});
    await postResolveChecks(tenantId, user, tenantMember, context);
    await auditSuccess(tenantId, user.userId, tenantMember.memberRole, context);
    return { tenant, tenantMember };
  });
}

/** Post-resolution security checks (concurrent limit, geo anomaly). */
async function postResolveChecks(
  tenantId: string,
  user: SafeUser,
  _member: SafeTenantMember,
  context?: TenantSessionRequestContext,
): Promise<void> {
  if (!context) return;
  const ttl = await resolveSessionTtl(tenantId);
  await assertConcurrentLimit(tenantId, user.userId, context, ttl);
  await checkGeoAnomaly(tenantId, user.userId, context);
}

async function auditDenial(
  tenantId: string, userId: string, requiredRole: TenantMemberRole,
  context: TenantSessionRequestContext | undefined, reason: string,
): Promise<void> {
  await AuditLogService.log({
    tenantId, actorId: userId, actorType: 'USER', action: 'tenant.session.denied',
    severity: 'medium', resourceType: 'tenant', resourceId: tenantId,
    ipAddress: context?.ip ?? null, userAgent: context?.userAgent ?? null,
    metadata: { reason, requiredRole },
  }).catch((e: unknown) => Logger.warn(`[tenant_session] audit denial failed: ${e instanceof Error ? e.message : e}`));
}

async function auditSuccess(
  tenantId: string, userId: string, role: TenantMemberRole,
  context: TenantSessionRequestContext | undefined,
): Promise<void> {
  await AuditLogService.log({
    tenantId, actorId: userId, actorType: 'USER', action: 'tenant.session.resolved',
    severity: 'low', resourceType: 'tenant', resourceId: tenantId,
    ipAddress: context?.ip ?? null, userAgent: context?.userAgent ?? null,
    metadata: { role },
  }).catch((e: unknown) => Logger.warn(`[tenant_session] audit success failed: ${e instanceof Error ? e.message : e}`));
}
