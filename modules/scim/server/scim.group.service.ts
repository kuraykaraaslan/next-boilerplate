import 'reflect-metadata';
import crypto from 'crypto';
import { IsNull, In } from 'typeorm';
import { tenantDataSourceFor } from '@nb/db';
import { TenantMember as TenantMemberEntity } from '@nb/tenant_member/server/entities/tenant_member.entity';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import { ErrorCode } from '@nb/common/server/app-error';
import { ScimError } from './scim.errors';
import { ScimGroup as ScimGroupEntity } from './entities/scim_group.entity';
import { ScimGroupMember as ScimGroupMemberEntity } from './entities/scim_group_member.entity';
import {
  SCIM_SCHEMAS, type ScimGroup, type ScimListResponse, type ScimPatchOperation,
} from './scim.types';
import ScimMessages from './scim.messages';
import ScimPolicyService from './scim.policy.service';

interface GroupWriteInput {
  displayName: string;
  externalId?: string | null;
  members?: Array<{ value: string }>;
  idp?: string;
}

/**
 * Full SCIM 2.0 Group provisioning (RFC 7644 §3.5). Groups are persisted,
 * members are real TenantMember references, and group membership drives the
 * member's role via the per-tenant group→role mapping — enabling Okta / Azure
 * AD group-based role provisioning (the enterprise integration gate).
 */
export default class ScimGroupService {

  private static async assertEnabled(tenantId: string): Promise<void> {
    const policy = await ScimPolicyService.get(tenantId);
    if (!policy.groupsEnabled) {
      throw new ScimError(ScimMessages.GROUPS_DISABLED, 501, ErrorCode.INTERNAL_ERROR);
    }
  }

  private static meta(tenantId: string, g: ScimGroupEntity): ScimGroup['meta'] {
    const stamp = g.updatedAt ?? g.createdAt ?? new Date();
    return {
      resourceType: 'Group',
      created: new Date(g.createdAt).toISOString(),
      lastModified: new Date(g.updatedAt ?? g.createdAt).toISOString(),
      location: `/tenant/${tenantId}/api/scim/v2/Groups/${g.scimGroupId}`,
      version: `W/"${crypto.createHash('sha1').update(String(stamp)).digest('hex').slice(0, 16)}"`,
    };
  }

  /** Assemble a SCIM Group from an entity + its already-loaded members (no I/O). */
  private static buildScimGroup(tenantId: string, g: ScimGroupEntity, members: ScimGroupMemberEntity[]): ScimGroup {
    return {
      schemas: [SCIM_SCHEMAS.GROUP],
      id: g.scimGroupId,
      displayName: g.displayName,
      ...(g.externalId ? { externalId: g.externalId } : {}),
      members: members.map((m) => ({ value: m.tenantMemberId, $ref: `../Users/${m.tenantMemberId}`, type: 'User' })),
      meta: this.meta(tenantId, g),
    } as ScimGroup;
  }

  private static async toScimGroup(tenantId: string, g: ScimGroupEntity): Promise<ScimGroup> {
    const ds = await tenantDataSourceFor(tenantId);
    const members = await ds.getRepository(ScimGroupMemberEntity).find({ where: { tenantId, scimGroupId: g.scimGroupId } });
    return this.buildScimGroup(tenantId, g, members);
  }

  static async listGroups(tenantId: string, query: { startIndex?: number; count?: number; idp?: string }): Promise<ScimListResponse<ScimGroup>> {
    const policy = await ScimPolicyService.get(tenantId);
    if (!policy.groupsEnabled) {
      return { schemas: [SCIM_SCHEMAS.LIST_RESPONSE], totalResults: 0, startIndex: query.startIndex ?? 1, itemsPerPage: 0, Resources: [] };
    }
    const ds = await tenantDataSourceFor(tenantId);
    const startIndex = Math.max(1, query.startIndex ?? 1);
    const count = Math.min(policy.maxPageSize, Math.max(0, query.count ?? policy.maxPageSize));
    const where: Record<string, unknown> = { tenantId, deletedAt: IsNull() };
    if (query.idp) where.idp = query.idp;
    const [rows, total] = await ds.getRepository(ScimGroupEntity).findAndCount({
      where: where as never, order: { createdAt: 'DESC' }, skip: startIndex - 1, take: count,
    });
    // Fetch members for every group in one query, then assemble in-memory —
    // avoids the per-group member lookup (N+1) that toScimGroup() would do.
    const groupIds = rows.map((g) => g.scimGroupId);
    const allMembers = groupIds.length
      ? await ds.getRepository(ScimGroupMemberEntity).find({ where: { tenantId, scimGroupId: In(groupIds) } })
      : [];
    const membersByGroup = new Map<string, ScimGroupMemberEntity[]>();
    for (const m of allMembers) {
      const arr = membersByGroup.get(m.scimGroupId) ?? [];
      arr.push(m);
      membersByGroup.set(m.scimGroupId, arr);
    }
    const Resources = rows.map((g) => this.buildScimGroup(tenantId, g, membersByGroup.get(g.scimGroupId) ?? []));
    return { schemas: [SCIM_SCHEMAS.LIST_RESPONSE], totalResults: total, startIndex, itemsPerPage: Resources.length, Resources };
  }

  static async getGroup(tenantId: string, scimGroupId: string): Promise<ScimGroup> {
    await this.assertEnabled(tenantId);
    const ds = await tenantDataSourceFor(tenantId);
    const g = await ds.getRepository(ScimGroupEntity).findOne({ where: { tenantId, scimGroupId, deletedAt: IsNull() } });
    if (!g) throw new ScimError(ScimMessages.GROUP_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return this.toScimGroup(tenantId, g);
  }

  static async createGroup(tenantId: string, input: GroupWriteInput): Promise<ScimGroup> {
    await this.assertEnabled(tenantId);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ScimGroupEntity);
    const idp = input.idp || 'default';
    const existing = await repo.findOne({ where: { tenantId, idp, displayName: input.displayName, deletedAt: IsNull() } });
    // Idempotent: re-provision of an existing group returns it instead of 409.
    if (existing) {
      if (input.members) await this.syncMembers(tenantId, existing, input.members.map((m) => m.value));
      return this.toScimGroup(tenantId, existing);
    }
    const g = await repo.save(repo.create({ tenantId, idp, displayName: input.displayName, externalId: input.externalId ?? null }));
    if (input.members?.length) await this.syncMembers(tenantId, g, input.members.map((m) => m.value));
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'scim.group.created',
      resourceType: 'scim_group', resourceId: g.scimGroupId,
      metadata: { displayName: g.displayName, idp, members: input.members?.length ?? 0 },
    }).catch(() => {});
    return this.toScimGroup(tenantId, g);
  }

  static async replaceGroup(tenantId: string, scimGroupId: string, input: GroupWriteInput): Promise<ScimGroup> {
    await this.assertEnabled(tenantId);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ScimGroupEntity);
    const g = await repo.findOne({ where: { tenantId, scimGroupId, deletedAt: IsNull() } });
    if (!g) throw new ScimError(ScimMessages.GROUP_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (input.displayName) g.displayName = input.displayName;
    if (input.externalId !== undefined) g.externalId = input.externalId ?? null;
    await repo.save(g);
    if (input.members) await this.syncMembers(tenantId, g, input.members.map((m) => m.value));
    return this.toScimGroup(tenantId, g);
  }

  static async patchGroup(tenantId: string, scimGroupId: string, ops: ScimPatchOperation[]): Promise<ScimGroup> {
    await this.assertEnabled(tenantId);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ScimGroupEntity);
    const g = await repo.findOne({ where: { tenantId, scimGroupId, deletedAt: IsNull() } });
    if (!g) throw new ScimError(ScimMessages.GROUP_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    for (const op of ops) {
      const path = (op.path ?? '').trim().toLowerCase();
      if (path === 'displayname' && typeof op.value === 'string') {
        g.displayName = op.value;
      } else if (path === 'members' || path.startsWith('members')) {
        const vals = this.extractMemberValues(op.value);
        if (op.op === 'add') await this.addMembers(tenantId, g, vals);
        else if (op.op === 'remove') await this.removeMembers(tenantId, g, vals, path);
        else if (op.op === 'replace') await this.syncMembers(tenantId, g, vals);
      } else if (!op.path && op.value && typeof op.value === 'object' && 'displayName' in op.value) {
        g.displayName = String((op.value as Record<string, unknown>).displayName);
      }
    }
    await repo.save(g);
    return this.toScimGroup(tenantId, g);
  }

  static async deleteGroup(tenantId: string, scimGroupId: string): Promise<void> {
    await this.assertEnabled(tenantId);
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ScimGroupEntity);
    const g = await repo.findOne({ where: { tenantId, scimGroupId, deletedAt: IsNull() } });
    if (!g) throw new ScimError(ScimMessages.GROUP_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const memberIds = (await ds.getRepository(ScimGroupMemberEntity).find({ where: { tenantId, scimGroupId } })).map((m) => m.tenantMemberId);
    await ds.getRepository(ScimGroupMemberEntity).delete({ tenantId, scimGroupId });
    await repo.softRemove(g);
    // Re-resolve roles for affected members now that the group is gone.
    for (const mid of memberIds) await this.recomputeMemberRole(tenantId, mid);
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'scim.group.deleted',
      resourceType: 'scim_group', resourceId: scimGroupId, metadata: { displayName: g.displayName },
    }).catch(() => {});
  }

  // ── Membership helpers ──────────────────────────────────────────────────────

  private static extractMemberValues(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((v) => (typeof v === 'object' && v && 'value' in v ? String((v as Record<string, unknown>).value) : String(v)));
    if (value && typeof value === 'object' && 'value' in value) return [String((value as Record<string, unknown>).value)];
    if (typeof value === 'string') return [value];
    return [];
  }

  /** Set the group's membership to exactly `tenantMemberIds`. */
  private static async syncMembers(tenantId: string, g: ScimGroupEntity, tenantMemberIds: string[]): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ScimGroupMemberEntity);
    const current = await repo.find({ where: { tenantId, scimGroupId: g.scimGroupId } });
    const currentIds = new Set(current.map((c) => c.tenantMemberId));
    const target = new Set(tenantMemberIds);
    const toAdd = tenantMemberIds.filter((id) => !currentIds.has(id));
    const toRemove = current.filter((c) => !target.has(c.tenantMemberId)).map((c) => c.tenantMemberId);
    if (toAdd.length) await this.addMembers(tenantId, g, toAdd);
    if (toRemove.length) await this.removeMembers(tenantId, g, toRemove);
  }

  private static async addMembers(tenantId: string, g: ScimGroupEntity, tenantMemberIds: string[]): Promise<void> {
    if (!tenantMemberIds.length) return;
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ScimGroupMemberEntity);
    for (const tenantMemberId of tenantMemberIds) {
      const exists = await repo.findOne({ where: { tenantId, scimGroupId: g.scimGroupId, tenantMemberId } });
      if (!exists) await repo.save(repo.create({ tenantId, scimGroupId: g.scimGroupId, tenantMemberId }));
      await this.recomputeMemberRole(tenantId, tenantMemberId);
    }
  }

  private static async removeMembers(tenantId: string, g: ScimGroupEntity, tenantMemberIds: string[], path?: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ScimGroupMemberEntity);
    // A bare `members` remove with no values clears the whole group.
    if ((!tenantMemberIds || tenantMemberIds.length === 0) && path === 'members') {
      const all = await repo.find({ where: { tenantId, scimGroupId: g.scimGroupId } });
      await repo.delete({ tenantId, scimGroupId: g.scimGroupId });
      for (const m of all) await this.recomputeMemberRole(tenantId, m.tenantMemberId);
      return;
    }
    for (const tenantMemberId of tenantMemberIds) {
      await repo.delete({ tenantId, scimGroupId: g.scimGroupId, tenantMemberId });
      await this.recomputeMemberRole(tenantId, tenantMemberId);
    }
  }

  /**
   * Recompute a member's role from the group→role mapping across all of their
   * groups (highest privilege wins). Falls back to the policy default role when
   * the member belongs to no mapped group.
   */
  static async recomputeMemberRole(tenantId: string, tenantMemberId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const policy = await ScimPolicyService.get(tenantId);
    const memberships = await ds.getRepository(ScimGroupMemberEntity).find({ where: { tenantId, tenantMemberId } });
    const groupIds = memberships.map((m) => m.scimGroupId);
    const groups = groupIds.length
      ? await ds.getRepository(ScimGroupEntity).find({ where: { tenantId, scimGroupId: In(groupIds) } })
      : [];
    const role = ScimPolicyService.highestRoleForGroups(policy, groups.map((g) => g.displayName)) ?? policy.defaultRole;
    const memberRepo = ds.getRepository(TenantMemberEntity);
    const member = await memberRepo.findOne({ where: { tenantId, tenantMemberId } });
    if (member && member.memberRole !== role) {
      member.memberRole = role;
      await memberRepo.save(member);
      AuditLogService.log({
        tenantId, actorType: 'SYSTEM', action: 'scim.member.role_changed',
        resourceType: 'tenant_member', resourceId: tenantMemberId, metadata: { role },
      }).catch(() => {});
    }
  }
}
