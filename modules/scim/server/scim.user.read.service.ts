import 'reflect-metadata';
import { IsNull, In } from 'typeorm';
import { getDataSource, tenantDataSourceFor } from '@nb/db';
import { User as UserEntity } from '@nb/user/server/entities/user.entity';
import { TenantMember as TenantMemberEntity } from '@nb/tenant_member/server/entities/tenant_member.entity';
import { ErrorCode } from '@nb/common/server/app-error';
import { ScimError } from './scim.errors';
import {
  SCIM_SCHEMAS, SCIM_PAGINATION,
  type ScimUser, type ScimListResponse,
} from './scim.types';
import type { ListScimUsersInput } from './scim.dto';
import ScimMessages from './scim.messages';
import ScimPolicyService from './scim.policy.service';
import { toScimUser, parseFilter } from './scim.user.serialize';
import { loadNames } from './scim.user.profile';

export async function listUsers(tenantId: string, query: ListScimUsersInput): Promise<ScimListResponse<ScimUser>> {
  const startIndex = Math.max(SCIM_PAGINATION.DEFAULT_START_INDEX, query.startIndex || 1);
  const count = Math.min(SCIM_PAGINATION.MAX_COUNT, Math.max(0, query.count ?? SCIM_PAGINATION.DEFAULT_COUNT));
  const tenantDs = await tenantDataSourceFor(tenantId);
  const memberRepo = tenantDs.getRepository(TenantMemberEntity);
  const sysDs = await getDataSource();
  const userRepo = sysDs.getRepository(UserEntity);
  const where: Record<string, unknown> = { tenantId, deletedAt: IsNull() };
  let userIdFilter: string | null = null;
  if (query.filter) {
    const parsed = parseFilter(query.filter);
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
    .map((m) => { const u = userMap.get(m.userId); return u ? toScimUser(m, u) : null; })
    .filter((x): x is ScimUser => x !== null);
  return { schemas: [SCIM_SCHEMAS.LIST_RESPONSE], totalResults: total, startIndex, itemsPerPage: Resources.length, Resources };
}

export async function getUser(tenantId: string, tenantMemberId: string): Promise<ScimUser> {
  const tenantDs = await tenantDataSourceFor(tenantId);
  const member = await tenantDs.getRepository(TenantMemberEntity).findOne({ where: { tenantMemberId, deletedAt: IsNull() } });
  if (!member || member.tenantId !== tenantId) throw new ScimError(ScimMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  const sysDs = await getDataSource();
  const user = await sysDs.getRepository(UserEntity).findOne({ where: { userId: member.userId } });
  if (!user) throw new ScimError(ScimMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  const policy = await ScimPolicyService.get(tenantId);
  return toScimUser(member, user, await loadNames(tenantId, user.userId, policy));
}
