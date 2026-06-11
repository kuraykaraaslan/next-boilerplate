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

  static toScimUser(member: TenantMemberEntity, user: UserEntity): ScimUser {
    return ScimUserSchema.parse({
      schemas: [SCIM_SCHEMAS.USER],
      id: member.tenantMemberId,
      externalId: member.externalId ?? undefined,
      userName: user.email,
      name: {},
      displayName: user.email,
      emails: [{ value: user.email, primary: true, type: 'work' }],
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
    return ScimUserService.toScimUser(member, user);
  }

  static async createUser(tenantId: string, input: CreateScimUserInput): Promise<ScimUser> {
    const email = (input.emails?.find((e) => e.primary)?.value ?? input.emails?.[0]?.value ?? input.userName).toLowerCase();
    if (!email) throw new ScimError(ScimMessages.USERNAME_REQUIRED, 400, ErrorCode.VALIDATION_ERROR, 'invalidValue');
    const sysDs = await getDataSource();
    const userRepo = sysDs.getRepository(UserEntity);
    let user = await userRepo.findOne({ where: { email } });
    if (!user) {
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const hashed = await bcrypt.hash(randomSecret, 10);
      const newUser = userRepo.create({ email, password: hashed, userRole: 'USER', userStatus: 'ACTIVE' });
      user = await userRepo.save(newUser);
    }
    const tenantDs = await tenantDataSourceFor(tenantId);
    const memberRepo = tenantDs.getRepository(TenantMemberEntity);
    const existing = await memberRepo.findOne({ where: { tenantId, userId: user.userId, deletedAt: IsNull() } });
    if (existing) throw new ScimError(ScimMessages.USER_ALREADY_EXISTS, 409, ErrorCode.CONFLICT, 'uniqueness');
    const member = memberRepo.create({
      tenantId, userId: user.userId, memberRole: 'USER',
      memberStatus: input.active === false ? 'INACTIVE' : 'ACTIVE',
      externalId: input.externalId ?? null,
    } as Partial<TenantMemberEntity>);
    const saved = await memberRepo.save(member);
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'scim.user.created',
      resourceType: 'tenant_member', resourceId: saved.tenantMemberId,
      metadata: { externalId: input.externalId, userName: email, userId: user.userId },
    }).catch(() => {});
    return ScimUserService.toScimUser(saved, user);
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
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'scim.user.updated',
      resourceType: 'tenant_member', resourceId: saved.tenantMemberId,
      metadata: { externalId: saved.externalId, active: input.active },
    }).catch(() => {});
    return ScimUserService.toScimUser(saved, user);
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
    for (const op of ops) {
      if (!op.path) {
        if (op.op === 'remove') continue;
        if (op.value && typeof op.value === 'object') {
          if ('active' in op.value) member.memberStatus = op.value.active ? 'ACTIVE' : 'INACTIVE';
          if ('userName' in op.value && typeof op.value.userName === 'string') user.email = op.value.userName.toLowerCase();
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
        case 'name.givenname':
        case 'name.familyname':
        case 'displayname':
          break; // no-op until User entity grows name fields
        default:
          throw new ScimError(`${ScimMessages.INVALID_PATCH_PATH}: ${op.path}`, 400, ErrorCode.VALIDATION_ERROR, 'invalidPath');
      }
    }
    await userRepo.save(user);
    const saved = await memberRepo.save(member);
    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'scim.user.patched',
      resourceType: 'tenant_member', resourceId: saved.tenantMemberId,
      metadata: { ops: ops.map((o) => ({ op: o.op, path: o.path })) },
    }).catch(() => {});
    return ScimUserService.toScimUser(saved, user);
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
