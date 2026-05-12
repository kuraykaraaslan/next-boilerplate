import 'reflect-metadata';
import { IsNull, ILike, In } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { getSystemDataSource, tenantDataSourceFor, getDefaultTenantDataSource } from '@/libs/typeorm';
import redis from '@/libs/redis';
import { User as UserEntity } from '../user/entities/user.entity';
import { TenantMember as TenantMemberEntity } from './entities/tenant_member.entity';
import { SafeTenantMember, SafeTenantMemberSchema } from './tenant_member.types';
import { CreateTenantMemberInput, UpdateTenantMemberInput, GetTenantMembersInput, GetTenantMemberInput } from './tenant_member.dto';
import TenantMemberMessages from './tenant_member.messages';
import type { TenantMemberRole } from './tenant_member.enums';

export default class TenantMemberService {

  private static readonly ROLE_HIERARCHY: TenantMemberRole[] = ['OWNER', 'ADMIN', 'USER'];

  static async getByTenantId({ tenantId, page, pageSize, search, memberRole, memberStatus }: GetTenantMembersInput): Promise<{ members: SafeTenantMember[]; total: number }> {
    const whereBase: Record<string, unknown> = { tenantId, deletedAt: IsNull() };
    if (memberRole) whereBase.memberRole = memberRole;
    if (memberStatus) whereBase.memberStatus = memberStatus;

    if (search) {
      const sysDs = await getSystemDataSource();
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
    const sysDs = await getSystemDataSource();
    const users = await sysDs.getRepository(UserEntity).find({ where: { userId: In(userIds) } });
    const userMap = Object.fromEntries(users.map((u) => [u.userId, u]));

    return {
      members: members.map((member) => ({ ...SafeTenantMemberSchema.parse(member), user: userMap[member.userId] as any })),
      total,
    };
  }

  static async getById(tenantMemberId: string): Promise<SafeTenantMember> {
    const ds = await getDefaultTenantDataSource();
    const member = await ds.getRepository(TenantMemberEntity).findOne({ where: { tenantMemberId, deletedAt: IsNull() } });
    if (!member) throw new Error(TenantMemberMessages.MEMBER_NOT_FOUND);
    return SafeTenantMemberSchema.parse(member);
  }

  static async getByTenantAndUser({ tenantMemberId, tenantId, userId }: GetTenantMemberInput): Promise<SafeTenantMember | null> {
    if (tenantMemberId) {
      const ds = await getDefaultTenantDataSource();
      const member = await ds.getRepository(TenantMemberEntity).findOne({ where: { tenantMemberId, deletedAt: IsNull() } });
      if (!member || member.tenantId !== tenantId || member.userId !== userId) return null;
      return SafeTenantMemberSchema.parse(member);
    }
    if (!tenantId || !userId) return null;
    const ds = await tenantDataSourceFor(tenantId);
    const member = await ds.getRepository(TenantMemberEntity).findOne({ where: { tenantId, userId, deletedAt: IsNull() } });
    return member ? SafeTenantMemberSchema.parse(member) : null;
  }

  static async create(data: CreateTenantMemberInput): Promise<SafeTenantMember> {
    const ds = await tenantDataSourceFor(data.tenantId);
    const repo = ds.getRepository(TenantMemberEntity);
    const existing = await repo.findOne({ where: { tenantId: data.tenantId, userId: data.userId, deletedAt: IsNull() } });
    if (existing) throw new Error(TenantMemberMessages.MEMBER_ALREADY_EXISTS);

    const member = repo.create(data as Partial<TenantMemberEntity>);
    const saved = await repo.save(member);
    return SafeTenantMemberSchema.parse(saved);
  }

  static async update(tenantMemberId: string, data: UpdateTenantMemberInput): Promise<SafeTenantMember> {
    const ds = await getDefaultTenantDataSource();
    const repo = ds.getRepository(TenantMemberEntity);
    const member = await repo.findOne({ where: { tenantMemberId, deletedAt: IsNull() } });
    if (!member) throw new Error(TenantMemberMessages.MEMBER_NOT_FOUND);

    const tenantDs = await tenantDataSourceFor(member.tenantId);
    const tenantRepo = tenantDs.getRepository(TenantMemberEntity);

    if (member.memberRole === 'OWNER' && data.memberRole && data.memberRole !== 'OWNER') {
      const ownerCount = await tenantRepo.count({ where: { tenantId: member.tenantId, memberRole: 'OWNER', deletedAt: IsNull() } });
      if (ownerCount <= 1) throw new Error(TenantMemberMessages.CANNOT_DEMOTE_OWNER);
    }

    const updateData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null));
    await tenantRepo.update({ tenantMemberId }, updateData as Partial<TenantMemberEntity>);
    await tenantRepo.increment({ tenantMemberId }, 'sessionVersion', 1);
    await redis.del(`tenant:member:${member.userId}:${member.tenantId}`).catch(() => {});
    const updated = await tenantRepo.findOne({ where: { tenantMemberId } });
    return SafeTenantMemberSchema.parse(updated!);
  }

  static async delete(tenantMemberId: string): Promise<void> {
    const ds = await getDefaultTenantDataSource();
    const repo = ds.getRepository(TenantMemberEntity);
    const member = await repo.findOne({ where: { tenantMemberId, deletedAt: IsNull() } });
    if (!member) throw new Error(TenantMemberMessages.MEMBER_NOT_FOUND);

    const tenantDs = await tenantDataSourceFor(member.tenantId);
    const tenantRepo = tenantDs.getRepository(TenantMemberEntity);

    if (member.memberRole === 'OWNER') {
      const ownerCount = await tenantRepo.count({ where: { tenantId: member.tenantId, memberRole: 'OWNER', deletedAt: IsNull() } });
      if (ownerCount <= 1) throw new Error(TenantMemberMessages.LAST_OWNER);
    }

    await tenantRepo.update({ tenantMemberId }, { deletedAt: new Date() });
  }

  static async getUserTenants(userId: string): Promise<SafeTenantMember[]> {
    const ds = await getDefaultTenantDataSource();
    const members = await ds.getRepository(TenantMemberEntity).find({
      where: { userId, memberStatus: 'ACTIVE', deletedAt: IsNull() },
    });
    return members.map((m) => SafeTenantMemberSchema.parse(m));
  }

  static hasRole(member: SafeTenantMember, requiredRole: TenantMemberRole): boolean {
    const memberIdx = TenantMemberService.ROLE_HIERARCHY.indexOf(member.memberRole);
    const requiredIdx = TenantMemberService.ROLE_HIERARCHY.indexOf(requiredRole);
    return memberIdx <= requiredIdx;
  }

  static async checkPermission(tenantId: string, userId: string, requiredRole: TenantMemberRole): Promise<boolean> {
    const ds = await tenantDataSourceFor(tenantId);
    const member = await ds.getRepository(TenantMemberEntity).findOne({
      where: { tenantId, userId, memberStatus: 'ACTIVE', deletedAt: IsNull() },
    });
    if (!member) return false;
    return this.hasRole(SafeTenantMemberSchema.parse(member), requiredRole);
  }
}
