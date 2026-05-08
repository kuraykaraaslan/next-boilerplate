import 'reflect-metadata';
import { env } from '@/libs/env';
import { IsNull } from 'typeorm';
import { tenantDataSourceFor, getDefaultTenantDataSource } from '@/libs/typeorm';
import { Tenant as TenantEntity } from '@/modules/tenant/entities/tenant.entity';
import { TenantMember as TenantMemberEntity } from '@/modules/tenant_member/entities/tenant_member.entity';
import redis from '@/libs/redis';
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
    if (tenant.tenantStatus === 'INACTIVE') throw new Error(TenantAuthMessages.TENANT_INACTIVE);
    if (tenant.tenantStatus === 'SUSPENDED') throw new Error(TenantAuthMessages.TENANT_SUSPENDED);
  }

  static validateMemberStatus(tenantMember: SafeTenantMember): void {
    if (tenantMember.memberStatus === 'INACTIVE') throw new Error(TenantAuthMessages.MEMBER_INACTIVE);
    if (tenantMember.memberStatus === 'SUSPENDED') throw new Error(TenantAuthMessages.MEMBER_SUSPENDED);
    if (tenantMember.memberStatus === 'PENDING') throw new Error(TenantAuthMessages.MEMBER_PENDING);
  }

  static async authenticateTenantMembership({ user, tenantId, requiredRole = 'USER' }: {
    user: SafeUser;
    tenantId: string;
    requiredRole?: TenantMemberRole;
  }): Promise<{ tenant: SafeTenant; tenantMember: SafeTenantMember }> {
    const cacheKey = `tenant:member:${user.userId}:${tenantId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        if (cachedData?.tenant && cachedData?.tenantMember) {
          // Quick sessionVersion check to detect role/status changes
          const ds = await tenantDataSourceFor(tenantId);
          const dbMember = await ds.getRepository(TenantMemberEntity)
            .findOne({ where: { tenantId, userId: user.userId }, select: { sessionVersion: true } });
          if (dbMember && dbMember.sessionVersion !== cachedData.tenantMember.sessionVersion) {
            // Cache is stale — evict and fall through to full re-fetch below
            await redis.del(cacheKey);
          } else {
            if (!this.hasRequiredRole(cachedData.tenantMember.memberRole, requiredRole)) {
              throw new Error(TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS);
            }
            return { tenant: cachedData.tenant, tenantMember: cachedData.tenantMember };
          }
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.message === TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS) throw e;
        await redis.del(cacheKey);
      }
    }

    const tenant = await this.getTenantById(tenantId);
    if (!tenant) throw new Error(TenantAuthMessages.TENANT_NOT_FOUND);
    this.validateTenantStatus(tenant);

    const tenantMember = await this.getTenantMembership(tenantId, user.userId);
    if (!tenantMember) throw new Error(TenantAuthMessages.USER_NOT_MEMBER_OF_TENANT);
    this.validateMemberStatus(tenantMember);

    if (!this.hasRequiredRole(tenantMember.memberRole, requiredRole)) {
      throw new Error(TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS);
    }

    await redis.setex(cacheKey, TENANT_CACHE_TTL, JSON.stringify({ tenant, tenantMember }));
    return { tenant, tenantMember };
  }

  static async getUserTenants(userId: string): Promise<Array<{ tenant: SafeTenant; tenantMember: SafeTenantMember }>> {
    const ds = await getDefaultTenantDataSource();
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
