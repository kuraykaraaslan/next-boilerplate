import 'reflect-metadata';
import crypto from 'crypto';
import { IsNull, In } from 'typeorm';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import { User as UserEntity } from '@/modules/user/entities/user.entity';
import { TenantMember as TenantMemberEntity } from '@/modules/tenant_member/entities/tenant_member.entity';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import bcrypt from 'bcrypt';
import {
  SCIM_SCHEMAS,
  SCIM_PAGINATION,
  type ScimUser,
  type ScimGroup,
  type ScimListResponse,
  type ScimPatchOperation,
} from './scim.types';
import type {
  CreateScimUserInput,
  UpdateScimUserInput,
  ListScimUsersInput,
} from './scim.dto';
import ScimMessages from './scim.messages';

/**
 * SCIM 2.0 (RFC 7643/7644) — provisioning bridge between enterprise IdPs
 * and our `User` + `TenantMember` model.
 *
 * Mapping decisions:
 *   • `ScimUser.id`         → `TenantMember.tenantMemberId` (tenant-scoped).
 *   • `ScimUser.userName`   → `User.email` (primary identifier).
 *   • `ScimUser.externalId` → `TenantMember.externalId` (IdP GUID).
 *   • `ScimUser.active`     → `TenantMember.memberStatus`
 *                             (`true → ACTIVE`, `false → INACTIVE`).
 *
 * Deprovisioning is a soft-delete on `TenantMember`. The cross-tenant
 * `User` row is **never** removed — other tenants may still depend on it.
 *
 * Filtering supports only `eq` comparisons on `userName` and `externalId`,
 * matching the lowest common denominator across major IdPs. Anything else
 * returns `400 invalidFilter` per RFC 7644 §3.4.2.2.
 *
 * Groups are intentionally stubbed: most IdPs run "users-only" SCIM
 * profiles, and tying SCIM Groups to our membership model deserves its
 * own design pass.
 */
export default class ScimService {

  // ─── Mapping helpers ───────────────────────────────────────────────
  private static buildMeta(tenantId: string, tenantMemberId: string, updatedAt?: Date | null, createdAt?: Date | null): ScimUser['meta'] {
    const stamp = updatedAt ?? createdAt ?? new Date();
    return {
      resourceType: 'User',
      created: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
      lastModified: updatedAt ? new Date(updatedAt).toISOString() : new Date().toISOString(),
      location: `/tenant/${tenantId}/api/scim/v2/Users/${tenantMemberId}`,
      // Weak ETag — derived from updatedAt so IdPs can detect concurrent edits.
      version: `W/"${crypto.createHash('sha1').update(String(stamp)).digest('hex').slice(0, 16)}"`,
    };
  }

  private static toScimUser(member: TenantMemberEntity, user: UserEntity): ScimUser {
    const givenName = (user as any).givenName as string | undefined;
    const familyName = (user as any).familyName as string | undefined;
    return {
      schemas: [SCIM_SCHEMAS.USER],
      id: member.tenantMemberId,
      externalId: member.externalId ?? undefined,
      userName: user.email,
      name: {
        givenName,
        familyName,
        formatted: [givenName, familyName].filter(Boolean).join(' ') || undefined,
      },
      displayName: user.email,
      emails: [{ value: user.email, primary: true, type: 'work' }],
      active: member.memberStatus === 'ACTIVE',
      meta: ScimService.buildMeta(member.tenantId, member.tenantMemberId, member.updatedAt, member.createdAt),
    };
  }

  // ─── Filter parsing (eq only) ──────────────────────────────────────
  /**
   * Parses a SCIM filter expression. Returns `{ attr, value }` for the
   * subset we support, throws otherwise.
   * Examples:
   *   userName eq "alice@x.com"
   *   externalId eq "okta-123"
   */
  private static parseFilter(filter: string): { attr: 'userName' | 'externalId'; value: string } {
    const match = /^\s*(userName|externalId)\s+eq\s+"([^"]*)"\s*$/i.exec(filter);
    if (!match) {
      const err = new Error(ScimMessages.INVALID_FILTER);
      (err as any).scimType = 'invalidFilter';
      (err as any).status = 400;
      throw err;
    }
    return { attr: match[1] as 'userName' | 'externalId', value: match[2] };
  }

  // ─── List ──────────────────────────────────────────────────────────
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
      const parsed = ScimService.parseFilter(query.filter);
      if (parsed.attr === 'externalId') {
        where.externalId = parsed.value;
      } else {
        // userName → look up the global User first, then constrain by userId.
        const u = await userRepo.findOne({ where: { email: parsed.value.toLowerCase() } });
        if (!u) {
          return {
            schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
            totalResults: 0,
            startIndex,
            itemsPerPage: 0,
            Resources: [],
          };
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
    const users = userIds.length
      ? await userRepo.find({ where: { userId: In(userIds) } })
      : [];
    const userMap = new Map(users.map((u) => [u.userId, u]));

    const Resources = members
      .map((m) => {
        const u = userMap.get(m.userId);
        return u ? ScimService.toScimUser(m, u) : null;
      })
      .filter((x): x is ScimUser => x !== null);

    return {
      schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
      totalResults: total,
      startIndex,
      itemsPerPage: Resources.length,
      Resources,
    };
  }

  // ─── Read ──────────────────────────────────────────────────────────
  static async getUser(tenantId: string, tenantMemberId: string): Promise<ScimUser> {
    const tenantDs = await tenantDataSourceFor(tenantId);
    const member = await tenantDs.getRepository(TenantMemberEntity).findOne({
      where: { tenantMemberId, deletedAt: IsNull() },
    });
    if (!member || member.tenantId !== tenantId) {
      const err = new Error(ScimMessages.USER_NOT_FOUND);
      (err as any).status = 404;
      throw err;
    }
    const sysDs = await getDataSource();
    const user = await sysDs.getRepository(UserEntity).findOne({ where: { userId: member.userId } });
    if (!user) {
      const err = new Error(ScimMessages.USER_NOT_FOUND);
      (err as any).status = 404;
      throw err;
    }
    return ScimService.toScimUser(member, user);
  }

  // ─── Create ────────────────────────────────────────────────────────
  static async createUser(tenantId: string, input: CreateScimUserInput): Promise<ScimUser> {
    const email = (input.emails?.find((e) => e.primary)?.value ?? input.emails?.[0]?.value ?? input.userName).toLowerCase();
    if (!email) {
      const err = new Error(ScimMessages.USERNAME_REQUIRED);
      (err as any).status = 400;
      (err as any).scimType = 'invalidValue';
      throw err;
    }

    const sysDs = await getDataSource();
    const userRepo = sysDs.getRepository(UserEntity);
    let user = await userRepo.findOne({ where: { email } });

    if (!user) {
      // Random throwaway password — SCIM-provisioned users always sign in
      // via SSO. We never expose this back to the IdP.
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const hashed = await bcrypt.hash(randomSecret, 10);
      const newUser = userRepo.create({
        email,
        password: hashed,
        userRole: 'USER',
        userStatus: 'ACTIVE',
      });
      user = await userRepo.save(newUser);
    }

    const tenantDs = await tenantDataSourceFor(tenantId);
    const memberRepo = tenantDs.getRepository(TenantMemberEntity);

    const existing = await memberRepo.findOne({ where: { tenantId, userId: user.userId, deletedAt: IsNull() } });
    if (existing) {
      const err = new Error(ScimMessages.USER_ALREADY_EXISTS);
      (err as any).status = 409;
      (err as any).scimType = 'uniqueness';
      throw err;
    }

    const member = memberRepo.create({
      tenantId,
      userId: user.userId,
      memberRole: 'USER',
      memberStatus: input.active === false ? 'INACTIVE' : 'ACTIVE',
      externalId: input.externalId ?? null,
    } as Partial<TenantMemberEntity>);
    const saved = await memberRepo.save(member);

    await AuditLogService.log({
      tenantId,
      actorType: 'SYSTEM',
      action: 'scim.user.created',
      resourceType: 'tenant_member',
      resourceId: saved.tenantMemberId,
      metadata: { externalId: input.externalId, userName: email, userId: user.userId },
    });

    return ScimService.toScimUser(saved, user);
  }

  // ─── Update (PUT — full replace) ───────────────────────────────────
  static async updateUser(tenantId: string, tenantMemberId: string, input: UpdateScimUserInput): Promise<ScimUser> {
    const tenantDs = await tenantDataSourceFor(tenantId);
    const memberRepo = tenantDs.getRepository(TenantMemberEntity);
    const member = await memberRepo.findOne({ where: { tenantMemberId, deletedAt: IsNull() } });
    if (!member || member.tenantId !== tenantId) {
      const err = new Error(ScimMessages.USER_NOT_FOUND);
      (err as any).status = 404;
      throw err;
    }

    const sysDs = await getDataSource();
    const userRepo = sysDs.getRepository(UserEntity);
    const user = await userRepo.findOne({ where: { userId: member.userId } });
    if (!user) {
      const err = new Error(ScimMessages.USER_NOT_FOUND);
      (err as any).status = 404;
      throw err;
    }

    // userName / email
    const newEmail = (input.emails?.find((e) => e.primary)?.value ?? input.emails?.[0]?.value ?? input.userName)?.toLowerCase();
    if (newEmail && newEmail !== user.email) {
      const collision = await userRepo.findOne({ where: { email: newEmail } });
      if (collision && collision.userId !== user.userId) {
        const err = new Error(ScimMessages.USER_ALREADY_EXISTS);
        (err as any).status = 409;
        (err as any).scimType = 'uniqueness';
        throw err;
      }
      user.email = newEmail;
      await userRepo.save(user);
    }

    if (input.externalId !== undefined) member.externalId = input.externalId ?? null;
    if (input.active !== undefined) member.memberStatus = input.active ? 'ACTIVE' : 'INACTIVE';
    const saved = await memberRepo.save(member);

    await AuditLogService.log({
      tenantId,
      actorType: 'SYSTEM',
      action: 'scim.user.updated',
      resourceType: 'tenant_member',
      resourceId: saved.tenantMemberId,
      metadata: { externalId: saved.externalId, active: input.active },
    });

    return ScimService.toScimUser(saved, user);
  }

  // ─── Patch ─────────────────────────────────────────────────────────
  static async patchUser(tenantId: string, tenantMemberId: string, ops: ScimPatchOperation[]): Promise<ScimUser> {
    const tenantDs = await tenantDataSourceFor(tenantId);
    const memberRepo = tenantDs.getRepository(TenantMemberEntity);
    const member = await memberRepo.findOne({ where: { tenantMemberId, deletedAt: IsNull() } });
    if (!member || member.tenantId !== tenantId) {
      const err = new Error(ScimMessages.USER_NOT_FOUND);
      (err as any).status = 404;
      throw err;
    }

    const sysDs = await getDataSource();
    const userRepo = sysDs.getRepository(UserEntity);
    const user = await userRepo.findOne({ where: { userId: member.userId } });
    if (!user) {
      const err = new Error(ScimMessages.USER_NOT_FOUND);
      (err as any).status = 404;
      throw err;
    }

    for (const op of ops) {
      // Azure AD sends `{ op: 'Replace', value: { active: false } }` without a path.
      // Okta sends explicit paths like `active` or `name.givenName`.
      if (!op.path) {
        if (op.op === 'remove') continue; // no-op — nothing to remove without a path
        if (op.value && typeof op.value === 'object') {
          if ('active' in op.value) member.memberStatus = op.value.active ? 'ACTIVE' : 'INACTIVE';
          if ('userName' in op.value && typeof op.value.userName === 'string') {
            user.email = op.value.userName.toLowerCase();
          }
        }
        continue;
      }

      const path = op.path.trim();
      const lower = path.toLowerCase();

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
        case 'name.givenname':
        case 'name.familyname':
        case 'displayname':
          // No-op until User entity grows name fields. Accepted silently
          // so IdPs do not retry forever.
          break;
        default: {
          const err = new Error(`${ScimMessages.INVALID_PATCH_PATH}: ${path}`);
          (err as any).status = 400;
          (err as any).scimType = 'invalidPath';
          throw err;
        }
      }
    }

    await userRepo.save(user);
    const saved = await memberRepo.save(member);

    await AuditLogService.log({
      tenantId,
      actorType: 'SYSTEM',
      action: 'scim.user.patched',
      resourceType: 'tenant_member',
      resourceId: saved.tenantMemberId,
      metadata: { ops: ops.map((o) => ({ op: o.op, path: o.path })) },
    });

    return ScimService.toScimUser(saved, user);
  }

  // ─── Delete (soft on TenantMember; User stays) ─────────────────────
  static async deleteUser(tenantId: string, tenantMemberId: string): Promise<void> {
    const tenantDs = await tenantDataSourceFor(tenantId);
    const memberRepo = tenantDs.getRepository(TenantMemberEntity);
    const member = await memberRepo.findOne({ where: { tenantMemberId, deletedAt: IsNull() } });
    if (!member || member.tenantId !== tenantId) {
      const err = new Error(ScimMessages.USER_NOT_FOUND);
      (err as any).status = 404;
      throw err;
    }
    // Deprovision: mark inactive, soft-delete. The cross-tenant `User` row
    // is preserved so the person can still log into other tenants.
    member.memberStatus = 'INACTIVE';
    member.deletedAt = new Date();
    await memberRepo.save(member);

    await AuditLogService.log({
      tenantId,
      actorType: 'SYSTEM',
      action: 'scim.user.deleted',
      resourceType: 'tenant_member',
      resourceId: tenantMemberId,
      metadata: { externalId: member.externalId },
    });
  }

  // ─── Groups (stubs) ────────────────────────────────────────────────
  static async listGroups(_tenantId: string, query: { startIndex?: number; count?: number }): Promise<ScimListResponse<ScimGroup>> {
    return {
      schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
      totalResults: 0,
      startIndex: query.startIndex ?? 1,
      itemsPerPage: 0,
      Resources: [],
    };
  }
}
