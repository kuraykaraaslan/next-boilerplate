import 'reflect-metadata';
import { SafeTenantMember } from './tenant_member.types';
import { CreateTenantMemberInput, UpdateTenantMemberInput, GetTenantMembersInput, GetTenantMemberInput } from './tenant_member.dto';
import type { TenantMemberRole } from './tenant_member.enums';
import { resolveDefaultRole, hasRole, checkPermission } from './tenant_member.helpers';
import { getByTenantId, getById, getByTenantAndUser, getUserTenants } from './tenant_member.read.service';
import {
  create, update, suspend, unsuspend, touchLastActive, transferOwnership, remove,
} from './tenant_member.write.service';

/**
 * Tenant-member service facade. The implementation is split across focused
 * modules (`tenant_member.helpers` role resolution + permission checks,
 * `tenant_member.read.service` queries, `tenant_member.write.service` mutations
 * + lifecycle); this class preserves the single `TenantMemberService.*` entry
 * point its callers depend on.
 */
export default class TenantMemberService {
  static resolveDefaultRole(tenantId: string): Promise<TenantMemberRole> {
    return resolveDefaultRole(tenantId);
  }

  static getByTenantId(input: GetTenantMembersInput): Promise<{ members: SafeTenantMember[]; total: number }> {
    return getByTenantId(input);
  }

  static getById(tenantMemberId: string, tenantId: string): Promise<SafeTenantMember> {
    return getById(tenantMemberId, tenantId);
  }

  static getByTenantAndUser(input: GetTenantMemberInput): Promise<SafeTenantMember | null> {
    return getByTenantAndUser(input);
  }

  static create(data: CreateTenantMemberInput): Promise<SafeTenantMember> {
    return create(data);
  }

  static update(tenantMemberId: string, tenantId: string, data: UpdateTenantMemberInput): Promise<SafeTenantMember> {
    return update(tenantMemberId, tenantId, data);
  }

  static suspend(
    tenantMemberId: string,
    tenantId: string,
    opts: { reason: string; until?: Date | null } = { reason: '' },
  ): Promise<SafeTenantMember> {
    return suspend(tenantMemberId, tenantId, opts);
  }

  static unsuspend(tenantMemberId: string, tenantId: string): Promise<SafeTenantMember> {
    return unsuspend(tenantMemberId, tenantId);
  }

  static touchLastActive(tenantId: string, userId: string): Promise<void> {
    return touchLastActive(tenantId, userId);
  }

  static transferOwnership(tenantId: string, toUserId: string, demoteToRole: TenantMemberRole = 'ADMIN'): Promise<void> {
    return transferOwnership(tenantId, toUserId, demoteToRole);
  }

  static delete(tenantMemberId: string, tenantId: string): Promise<void> {
    return remove(tenantMemberId, tenantId);
  }

  static getUserTenants(userId: string) {
    return getUserTenants(userId);
  }

  static hasRole(member: SafeTenantMember, requiredRole: TenantMemberRole): boolean {
    return hasRole(member, requiredRole);
  }

  static checkPermission(tenantId: string, userId: string, requiredRole: TenantMemberRole): Promise<boolean> {
    return checkPermission(tenantId, userId, requiredRole);
  }
}
