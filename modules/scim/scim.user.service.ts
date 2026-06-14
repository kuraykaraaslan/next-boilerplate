import 'reflect-metadata';
import crypto from 'crypto';
import { IsNull, In } from 'typeorm';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import { User as UserEntity } from '@/modules/user/entities/user.entity';
import { TenantMember as TenantMemberEntity } from '@/modules/tenant_member/entities/tenant_member.entity';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import bcrypt from 'bcrypt';
import { ErrorCode } from '@/modules/common/app-error';
import { ScimError } from './scim.errors';
import {
  SCIM_SCHEMAS, SCIM_PAGINATION, ScimUserSchema,
  type ScimUser, type ScimListResponse, type ScimPatchOperation,
} from './scim.types';
import type { CreateScimUserInput, UpdateScimUserInput, ListScimUsersInput } from './scim.dto';
import ScimMessages from './scim.messages';
import ScimPolicyService from './scim.policy.service';

export default class ScimUserService {

  private static buildMeta(tenantId: string, tenantMemberId: string, updatedAt?: Date | null, createdAt?: Date | null): ScimUser['meta'] {
    const stamp = updatedAt ?? createdAt ?? new Date();
    return {
      resourceType: 'User',
      created: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
      lastModified: updatedAt ? new Date(updatedAt).toISOString() : new Date().toISOString(),
      location: `/tenant/${tenantId}/api/scim/v2/Users/${tenantMemberId}`,
      version: `W/"${crypto.createHash('sha1').update(String(stamp)).digest('hex').slice(0, 16)}"`,
    };
  }

  static toScimUser(
    member: TenantMemberEntity,
    user: UserEntity,
    names?: { givenName?: string; familyName?: string; displayName?: string },
  ): ScimUser {
    return ScimUserSchema.parse({
      schemas: [SCIM_SCHEMAS.USER],
      id: member.tenantMemberId,
      externalId: member.externalId ?? undefined,
      userName: user.email,
      name: { givenName: names?.givenName, familyName: names?.familyName },
      displayName: names?.displayName ?? user.email,
      emails: [{ value: user.email, primary: true, type: 'work' }],
      ...(user.phone ? { phoneNumbers: [{ value: user.phone, primary: true, type: 'work' }] } : {}),
      active: member.memberStatus === 'ACTIVE',
      meta: ScimUserService.buildMeta(member.tenantId, member.tenantMemberId, member.updatedAt, member.createdAt),
    });
  }

  static parseFilter(filter: string): { attr: 'userName' | 'externalId'; value: string } {
    const match = /^\s*(userName|externalId)\s+eq\s+"([^"]*)"\s*$/i.exec(filter);
    if (!match) {
      throw new ScimError(ScimMessages.INVALID_FILTER, 400, ErrorCode.VALIDATION_ERROR, 'invalidFilter');
    }
    return { attr: match[1] as 'userName' | 'externalId', value: match[2] };
  }

  static async listUsers(tenantId: string, query: ListScimUsersInput): Promise<ScimListResponse<ScimUser>> {
    const startIndex = Math.max(SCIM_PAGINATION.DEFAULT_START_INDEX, query.startIndex || 1);
    const count = Math.min(SCIM_PAGINATION.MAX_COUNT, Math.max(0, query.count ?? SCIM_PAGINATION.DEFAULT_COUNT));
    const tenantDs = await tenantDataSourceFor(tenantId);
    const memberRepo = tenantDs.getRepository(TenantMemberEntity);
    const sysDs = await getDataSource();
    const userRepo = sysDs.getRepository(UserEntity);
    const where: Record<string, unknown> = { tenantId, deletedAt: IsNull() };
    let userIdFilter: string | null = null;
    if (query.filter) {
      const parsed = ScimUserService.parseFilter(query.filter);
      if (parsed.attr === 'externalId') {
        where.externalId = parsed.value;
      } else {
        const u = await userRepo.findOne({ where: { email: parsed.value.toLowerCase() } });
        if (!u) {
          return { schemas: [SCIM_SCHEMAS.LIST_RESPONSE], totalResults: 0, startIndex, itemsPerPage: 0, Resources: [] };
        }
        userIdFilter = u.userId;
        where.userId = u.userId;
      }
    }
    const [members, total] = await memberRepo.findAndCount({
      where: where as any,
      order: { createdAt: 'DESC' },
      skip: startIndex - 1,
      take: count,
    });
    const userIds = userIdFilter ? [userIdFilter] : Array.from(new Set(members.map((m) => m.userId)));
    const users = userIds.length ? await userRepo.find({ where: { userId: In(userIds) } }) : [];
    const userMap = new Map(users.map((u) => [u.userId, u]));
    const Resources = members
      .map((m) => { const u = userMap.get(m.userId); return u ? ScimUserService.toScimUser(m, u) : null; })
      .filter((x): x is ScimUser => x !== null);
    return { schemas: [SCIM_SCHEMAS.LIST_RESPONSE], totalResults: total, startIndex, itemsPerPage: Resources.length, Resources };
  }

  static async getUser(tenantId: string, tenantMemberId: string): Promise<ScimUser> {
    const tenantDs = await tenantDataSourceFor(tenantId);
    const member = await tenantDs.getRepository(TenantMemberEntity).findOne({ where: { tenantMemberId, deletedAt: IsNull() } });
    if (!member || member.tenantId !== tenantId) throw new ScimError(ScimMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const sysDs = await getDataSource();
    const user = await sysDs.getRepository(UserEntity).findOne({ where: { userId: member.userId } });
    if (!user) throw new ScimError(ScimMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const policy = await ScimPolicyService.get(tenantId);
    return ScimUserService.toScimUser(member, user, await ScimUserService.loadNames(tenantId, user.userId, policy));
  }

  static async createUser(tenantId: string, input: CreateScimUserInput): Promise<ScimUser> {
    const email = (input.emails?.find((e) => e.primary)?.value ?? input.emails?.[0]?.value ?? input.userName).toLowerCase();
    if (!email) throw new ScimError(ScimMessages.USERNAME_REQUIRED, 400, ErrorCode.VALIDATION_ERROR, 'invalidValue');
    const policy = await ScimPolicyService.get(tenantId);
    const sysDs = await getDataSource();
    const userRepo = sysDs.getRepository(UserEntity);

    let user = await userRepo.findOne({ where: { email } });
    const mintedNewUser = !user;
    if (!user) {
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const hashed = await bcrypt.hash(randomSecret, 10);
      const newUser = userRepo.create({ email, password: hashed, userRole: 'USER', userStatus: 'ACTIVE' });
      if (input.phoneNumbers?.length) newUser.phone = input.phoneNumbers.find((p) => p.primary)?.value ?? input.phoneNumbers[0].value;
      user = await userRepo.save(newUser);
      // Cross-tenant identity creation is its own auditable security event.
      AuditLogService.log({
        tenantId, actorType: 'SYSTEM', action: 'scim.identity.created',
        severity: 'medium', resourceType: 'user', resourceId: user.userId,
        metadata: { email, source: 'scim' },
      }).catch(() => {});
    } else if (input.phoneNumbers?.length && !user.phone) {
      user.phone = input.phoneNumbers.find((p) => p.primary)?.value ?? input.phoneNumbers[0].value;
      await userRepo.save(user);
    }

    const tenantDs = await tenantDataSourceFor(tenantId);
    const memberRepo = tenantDs.getRepository(TenantMemberEntity);
    const existing = await memberRepo.findOne({ where: { tenantId, userId: user.userId, deletedAt: IsNull() } });
    if (existing) {
      // Idempotent create: an IdP retry where the member already exists with the
      // same externalId resolves to the existing resource instead of 409.
      if (input.externalId && existing.externalId === input.externalId) {
        await ScimUserService.persistProfile(tenantId, user.userId, input, policy);
        return ScimUserService.toScimUser(existing, user, await ScimUserService.loadNames(tenantId, user.userId, policy));
      }
      throw new ScimError(ScimMessages.USER_ALREADY_EXISTS, 409, ErrorCode.CONFLICT, 'uniqueness');
    }

    const member = memberRepo.create({
      tenantId, userId: user.userId, memberRole: policy.defaultRole,
      memberStatus: input.active === false ? 'INACTIVE' : 'ACTIVE',
      externalId: input.externalId ?? null,
    } as Partial<TenantMemberEntity>);
    const saved = await memberRepo.save(member);
    await ScimUserService.persistProfile(tenantId, user.userId, input, policy);
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'scim.user.created',
      resourceType: 'tenant_member', resourceId: saved.tenantMemberId,
      metadata: { externalId: input.externalId, userName: email, userId: user.userId, mintedNewUser, role: policy.defaultRole },
    }).catch(() => {});
    return ScimUserService.toScimUser(saved, user, await ScimUserService.loadNames(tenantId, user.userId, policy));
  }

  /**
   * Persist SCIM name fields, locale, and enterprise-extension attributes onto
   * the user_profile (names + customFields). No-op when the tenant disables
   * name sync.
   */
  private static async persistProfile(
    tenantId: string, userId: string, input: CreateScimUserInput | UpdateScimUserInput, policy: { syncNames: boolean },
  ): Promise<void> {
    if (!policy.syncNames) return;
    try {
      const ent = (input as Record<string, unknown>)[SCIM_SCHEMAS.ENTERPRISE_USER] as Record<string, unknown> | undefined;
      const customFields: Record<string, unknown> = {};
      if (input.locale) customFields.locale = input.locale;
      if (ent) {
        for (const k of ['employeeNumber', 'department', 'organization', 'costCenter', 'division'] as const) {
          if (ent[k] != null) customFields[k] = ent[k];
        }
        if (ent.manager) customFields.manager = typeof ent.manager === 'string' ? ent.manager : (ent.manager as Record<string, unknown>).value;
      }
      const patch: Record<string, unknown> = {};
      if (input.name?.givenName !== undefined) patch.firstName = input.name.givenName;
      if (input.name?.familyName !== undefined) patch.lastName = input.name.familyName;
      if (input.displayName !== undefined) patch.displayName = input.displayName;
      if (Object.keys(customFields).length > 0) patch.customFields = customFields;
      if (Object.keys(patch).length === 0) return;

      const { default: UserProfileService } = await import('@/modules/user_profile/user_profile.service');
      await UserProfileService.upsert(userId, patch as never, tenantId);
    } catch { /* profile sync is best-effort, never blocks provisioning */ }
  }

  /** Load names from user_profile for SCIM responses (best-effort). */
  private static async loadNames(tenantId: string, userId: string, policy: { syncNames: boolean }): Promise<{ givenName?: string; familyName?: string; displayName?: string } | undefined> {
    if (!policy.syncNames) return undefined;
    try {
      const { default: UserProfileService } = await import('@/modules/user_profile/user_profile.service');
      const p = await UserProfileService.getByUserId(userId);
      if (!p) return undefined;
      return { givenName: p.firstName ?? undefined, familyName: p.lastName ?? undefined, displayName: p.displayName ?? undefined };
    } catch { return undefined; }
  }

  static async updateUser(tenantId: string, tenantMemberId: string, input: UpdateScimUserInput): Promise<ScimUser> {
    const tenantDs = await tenantDataSourceFor(tenantId);
    const memberRepo = tenantDs.getRepository(TenantMemberEntity);
    const member = await memberRepo.findOne({ where: { tenantMemberId, deletedAt: IsNull() } });
    if (!member || member.tenantId !== tenantId) throw new ScimError(ScimMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const sysDs = await getDataSource();
    const userRepo = sysDs.getRepository(UserEntity);
    const user = await userRepo.findOne({ where: { userId: member.userId } });
    if (!user) throw new ScimError(ScimMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const newEmail = (input.emails?.find((e) => e.primary)?.value ?? input.emails?.[0]?.value ?? input.userName)?.toLowerCase();
    if (newEmail && newEmail !== user.email) {
      const collision = await userRepo.findOne({ where: { email: newEmail } });
      if (collision && collision.userId !== user.userId) throw new ScimError(ScimMessages.USER_ALREADY_EXISTS, 409, ErrorCode.CONFLICT, 'uniqueness');
      user.email = newEmail;
      await userRepo.save(user);
    }
    if (input.externalId !== undefined) member.externalId = input.externalId ?? null;
    if (input.active !== undefined) member.memberStatus = input.active ? 'ACTIVE' : 'INACTIVE';
    const saved = await memberRepo.save(member);
    const policy = await ScimPolicyService.get(tenantId);
    await ScimUserService.persistProfile(tenantId, user.userId, input, policy);
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'scim.user.updated',
      resourceType: 'tenant_member', resourceId: saved.tenantMemberId,
      metadata: { externalId: saved.externalId, active: input.active },
    }).catch(() => {});
    return ScimUserService.toScimUser(saved, user, await ScimUserService.loadNames(tenantId, user.userId, policy));
  }

  static async patchUser(tenantId: string, tenantMemberId: string, ops: ScimPatchOperation[]): Promise<ScimUser> {
    const tenantDs = await tenantDataSourceFor(tenantId);
    const memberRepo = tenantDs.getRepository(TenantMemberEntity);
    const member = await memberRepo.findOne({ where: { tenantMemberId, deletedAt: IsNull() } });
    if (!member || member.tenantId !== tenantId) throw new ScimError(ScimMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const sysDs = await getDataSource();
    const userRepo = sysDs.getRepository(UserEntity);
    const user = await userRepo.findOne({ where: { userId: member.userId } });
    if (!user) throw new ScimError(ScimMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    // Collect name/profile changes to persist to user_profile after the loop.
    const profilePatch: Record<string, unknown> = {};
    for (const op of ops) {
      if (!op.path) {
        if (op.op === 'remove') continue;
        if (op.value && typeof op.value === 'object') {
          if ('active' in op.value) member.memberStatus = op.value.active ? 'ACTIVE' : 'INACTIVE';
          if ('userName' in op.value && typeof op.value.userName === 'string') user.email = op.value.userName.toLowerCase();
          if ('displayName' in op.value && typeof op.value.displayName === 'string') profilePatch.displayName = op.value.displayName;
          const nm = (op.value as Record<string, unknown>).name as Record<string, unknown> | undefined;
          if (nm?.givenName !== undefined) profilePatch.firstName = nm.givenName;
          if (nm?.familyName !== undefined) profilePatch.lastName = nm.familyName;
        }
        continue;
      }
      const lower = op.path.trim().toLowerCase();
      switch (lower) {
        case 'active':
          member.memberStatus = op.op === 'remove' ? 'INACTIVE' : (op.value ? 'ACTIVE' : 'INACTIVE');
          break;
        case 'username':
        case 'emails[primary eq true].value':
          if (op.op !== 'remove' && typeof op.value === 'string') user.email = op.value.toLowerCase();
          break;
        case 'externalid':
          member.externalId = op.op === 'remove' ? null : (typeof op.value === 'string' ? op.value : member.externalId);
          break;
        case 'phonenumbers[primary eq true].value':
        case 'phonenumbers':
          if (op.op !== 'remove' && typeof op.value === 'string') user.phone = op.value;
          break;
        case 'name.givenname':
          profilePatch.firstName = op.op === 'remove' ? null : op.value;
          break;
        case 'name.familyname':
          profilePatch.lastName = op.op === 'remove' ? null : op.value;
          break;
        case 'displayname':
          profilePatch.displayName = op.op === 'remove' ? null : op.value;
          break;
        default:
          throw new ScimError(`${ScimMessages.INVALID_PATCH_PATH}: ${op.path}`, 400, ErrorCode.VALIDATION_ERROR, 'invalidPath');
      }
    }
    await userRepo.save(user);
    const saved = await memberRepo.save(member);
    const policy = await ScimPolicyService.get(tenantId);
    if (policy.syncNames && Object.keys(profilePatch).length > 0) {
      try {
        const { default: UserProfileService } = await import('@/modules/user_profile/user_profile.service');
        await UserProfileService.upsert(user.userId, profilePatch as never, tenantId);
      } catch { /* best-effort */ }
    }
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'scim.user.patched',
      resourceType: 'tenant_member', resourceId: saved.tenantMemberId,
      metadata: { ops: ops.map((o) => ({ op: o.op, path: o.path })) },
    }).catch(() => {});
    return ScimUserService.toScimUser(saved, user, await ScimUserService.loadNames(tenantId, user.userId, policy));
  }

  static async deleteUser(tenantId: string, tenantMemberId: string): Promise<void> {
    const tenantDs = await tenantDataSourceFor(tenantId);
    const memberRepo = tenantDs.getRepository(TenantMemberEntity);
    const member = await memberRepo.findOne({ where: { tenantMemberId, deletedAt: IsNull() } });
    if (!member || member.tenantId !== tenantId) throw new ScimError(ScimMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    member.memberStatus = 'INACTIVE';
    member.deletedAt = new Date();
    await memberRepo.save(member);
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'scim.user.deleted',
      resourceType: 'tenant_member', resourceId: tenantMemberId,
      metadata: { externalId: member.externalId },
    }).catch(() => {});
  }
}
