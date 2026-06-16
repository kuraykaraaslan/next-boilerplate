import 'reflect-metadata';
import { IsNull, ILike, In } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { getDataSource, tenantDataSourceFor } from '@nb/db';
import { User as UserEntity } from '@nb/user/server/entities/user.entity';
import { Tenant as TenantEntity } from '@nb/tenant/server/entities/tenant.entity';
import { TenantMember as TenantMemberEntity } from './entities/tenant_member.entity';
import { SafeTenantMember, SafeTenantMemberSchema } from './tenant_member.types';
import { SafeUserSchema } from '@nb/user/server/user.types';
import { GetTenantMembersInput, GetTenantMemberInput } from './tenant_member.dto';
import TenantMemberMessages from './tenant_member.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';

export async function getByTenantId({ tenantId, page, pageSize, search, memberRole, memberStatus }: GetTenantMembersInput): Promise<{ members: SafeTenantMember[]; total: number }> {
  const whereBase: Record<string, unknown> = { tenantId, deletedAt: IsNull() };
  if (memberRole) whereBase.memberRole = memberRole;
  if (memberStatus) whereBase.memberStatus = memberStatus;

  if (search) {
    const sysDs = await getDataSource();
    const matchingUsers = await sysDs.getRepository(UserEntity).find({
      where: { email: ILike(`%${search}%`) },
      select: { userId: true },
    });
    const matchingIds = matchingUsers.map((u) => u.userId);
    if (!matchingIds.length) return { members: [], total: 0 };
    whereBase.userId = In(matchingIds);
  }

  const safePage = Math.max(1, page);
  const tenantDs = await tenantDataSourceFor(tenantId);
  const repo = tenantDs.getRepository(TenantMemberEntity);

  const [members, total] = await Promise.all([
    repo.find({ where: whereBase as FindOptionsWhere<TenantMemberEntity>, skip: (safePage - 1) * pageSize, take: pageSize, order: { createdAt: 'DESC' } }),
    repo.count({ where: whereBase as FindOptionsWhere<TenantMemberEntity> }),
  ]);

  const userIds = members.map((m) => m.userId);
  const sysDs = await getDataSource();
  const users = await sysDs.getRepository(UserEntity).find({ where: { userId: In(userIds) } });
  const userMap = Object.fromEntries(users.map((u) => [u.userId, u]));

  return {
    members: members.map((member) => ({
      ...SafeTenantMemberSchema.parse(member),
      user: userMap[member.userId] ? SafeUserSchema.parse(userMap[member.userId]) : undefined,
    })),
    total,
  };
}

export async function getById(tenantMemberId: string, tenantId: string): Promise<SafeTenantMember> {
  const ds = await tenantDataSourceFor(tenantId);
  const member = await ds.getRepository(TenantMemberEntity).findOne({ where: { tenantMemberId, tenantId, deletedAt: IsNull() } });
  if (!member) throw new AppError(TenantMemberMessages.MEMBER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  return SafeTenantMemberSchema.parse(member);
}

export async function getByTenantAndUser({ tenantMemberId, tenantId, userId }: GetTenantMemberInput): Promise<SafeTenantMember | null> {
  if (tenantMemberId) {
    if (!tenantId) return null;
    const ds = await tenantDataSourceFor(tenantId);
    const member = await ds.getRepository(TenantMemberEntity).findOne({ where: { tenantMemberId, tenantId, deletedAt: IsNull() } });
    if (!member || member.userId !== userId) return null;
    return SafeTenantMemberSchema.parse(member);
  }
  if (!tenantId || !userId) return null;
  const ds = await tenantDataSourceFor(tenantId);
  const member = await ds.getRepository(TenantMemberEntity).findOne({ where: { tenantId, userId, deletedAt: IsNull() } });
  return member ? SafeTenantMemberSchema.parse(member) : null;
}

export async function getUserTenants(userId: string) {
  const ds = await getDataSource();
  const members = await ds.getRepository(TenantMemberEntity).find({
    where: { userId, memberStatus: 'ACTIVE', deletedAt: IsNull() },
  });

  // Hydrate each membership with its tenant so the UI can show the tenant
  // name instead of falling back to the raw tenantId (uuid).
  const tenantIds = members.map((m) => m.tenantId);
  const tenants = tenantIds.length
    ? await ds.getRepository(TenantEntity).find({ where: { tenantId: In(tenantIds) } })
    : [];
  const tenantMap = Object.fromEntries(
    tenants.map((t) => [t.tenantId, { tenantId: t.tenantId, name: t.name, tenantStatus: t.tenantStatus }]),
  );

  return members.map((m) => ({
    ...SafeTenantMemberSchema.parse(m),
    tenant: tenantMap[m.tenantId],
  }));
}
