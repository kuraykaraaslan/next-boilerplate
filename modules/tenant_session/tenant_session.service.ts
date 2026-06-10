import 'reflect-metadata';
import { env } from '@/modules/env';
import { IsNull } from 'typeorm';
import { tenantDataSourceFor, getDataSource } from '@/modules/db';
import { Tenant as TenantEntity } from '@/modules/tenant/entities/tenant.entity';
import { TenantMember as TenantMemberEntity } from '@/modules/tenant_member/entities/tenant_member.entity';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { SafeTenant, SafeTenantSchema } from '@/modules/tenant/tenant.types';
import { SafeTenantMember, SafeTenantMemberSchema } from '@/modules/tenant_member/tenant_member.types';
import { SafeUser } from '@/modules/user/user.types';
import TenantAuthMessages from './tenant_session.messages';
import type { TenantMemberRole } from '@/modules/tenant_member/tenant_member.enums';

const TENANT_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

export default class TenantSessionService {

  private static readonly ROLE_HIERARCHY: TenantMemberRole[] = ['OWNER', 'ADMIN', 'USER'];

  static hasRequiredRole(memberRole: TenantMemberRole, requiredRole: TenantMemberRole): boolean {
    return TenantSessionService.ROLE_HIERARCHY.indexOf(memberRole) <= TenantSessionService.ROLE_HIERARCHY.indexOf(requiredRole);
  }

  static async getTenantById(tenantId: string): Promise<SafeTenant | null> {
    const ds = await tenantDataSourceFor(tenantId);
    const tenant = await ds.getRepository(TenantEntity).findOne({ where: { tenantId } });
    return tenant ? SafeTenantSchema.parse(tenant) : null;
  }

  static async getTenantMembership(tenantId: string, userId: string): Promise<SafeTenantMember | null> {
    const ds = await tenantDataSourceFor(tenantId);
    const member = await ds.getRepository(TenantMemberEntity).findOne({ where: { tenantId, userId, deletedAt: IsNull() } });
    return member ? SafeTenantMemberSchema.parse(member) : null;
  }

  static validateTenantStatus(tenant: SafeTenant): void {
    if (tenant.tenantStatus === 'INACTIVE') throw new AppError(TenantAuthMessages.TENANT_INACTIVE, 403, ErrorCode.FORBIDDEN);
    if (tenant.tenantStatus === 'SUSPENDED') throw new AppError(TenantAuthMessages.TENANT_SUSPENDED, 403, ErrorCode.TENANT_SUSPENDED);
  }

  static validateMemberStatus(tenantMember: SafeTenantMember): void {
    if (tenantMember.memberStatus === 'INACTIVE') throw new AppError(TenantAuthMessages.MEMBER_INACTIVE, 403, ErrorCode.FORBIDDEN);
    if (tenantMember.memberStatus === 'SUSPENDED') throw new AppError(TenantAuthMessages.MEMBER_SUSPENDED, 403, ErrorCode.FORBIDDEN);
    if (tenantMember.memberStatus === 'PENDING') throw new AppError(TenantAuthMessages.MEMBER_PENDING, 403, ErrorCode.FORBIDDEN);
  }

  static async authenticateTenantMembership({ user, tenantId, requiredRole = 'USER' }: {
    user: SafeUser;
    tenantId: string;
    requiredRole?: TenantMemberRole;
  }): Promise<{ tenant: SafeTenant; tenantMember: SafeTenantMember }> {
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
            if (!this.hasRequiredRole(cachedData.tenantMember.memberRole, requiredRole)) {
              throw new AppError(TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS, 403, ErrorCode.FORBIDDEN);
            }
            return { tenant: cachedData.tenant, tenantMember: cachedData.tenantMember };
          }
        }
      } catch (e: unknown) {
        if (e instanceof AppError) throw e;
        await redis.del(cacheKey).catch(() => {});
      }
    }

    return singleFlight(cacheKey, async () => {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant) throw new AppError(TenantAuthMessages.TENANT_NOT_FOUND, 404, ErrorCode.TENANT_NOT_FOUND);
      this.validateTenantStatus(tenant);

      const tenantMember = await this.getTenantMembership(tenantId, user.userId);
      if (!tenantMember) throw new AppError(TenantAuthMessages.USER_NOT_MEMBER_OF_TENANT, 403, ErrorCode.NOT_TENANT_MEMBER);
      this.validateMemberStatus(tenantMember);

      if (!this.hasRequiredRole(tenantMember.memberRole, requiredRole)) {
        throw new AppError(TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS, 403, ErrorCode.FORBIDDEN);
      }

      await redis.setex(cacheKey, jitter(TENANT_CACHE_TTL), JSON.stringify({ tenant, tenantMember })).catch(() => {});
      return { tenant, tenantMember };
    });
  }

  static async getUserTenants(userId: string): Promise<Array<{ tenant: SafeTenant; tenantMember: SafeTenantMember }>> {
    const ds = await getDataSource();
    const members = await ds.getRepository(TenantMemberEntity).find({
      where: { userId, memberStatus: 'ACTIVE', deletedAt: IsNull() },
    });

    const results: Array<{ tenant: SafeTenant; tenantMember: SafeTenantMember }> = [];
    for (const m of members) {
      const tDs = await tenantDataSourceFor(m.tenantId);
      const tenant = await tDs.getRepository(TenantEntity).findOne({ where: { tenantId: m.tenantId } });
      if (tenant && tenant.tenantStatus === 'ACTIVE') {
        results.push({ tenant: SafeTenantSchema.parse(tenant), tenantMember: SafeTenantMemberSchema.parse(m) });
      }
    }
    return results;
  }

  static async clearTenantCache(userId: string, tenantId: string): Promise<void> {
    await redis.del(`tenant:member:${userId}:${tenantId}`);
  }

  static async clearUserTenantCaches(userId: string): Promise<void> {
    const keys = await redis.keys(`tenant:member:${userId}:*`);
    if (keys.length > 0) await redis.del(...keys);
  }
}
