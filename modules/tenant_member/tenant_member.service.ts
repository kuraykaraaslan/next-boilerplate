import 'reflect-metadata';
import { IsNull, ILike, In } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import redis from '@/modules/redis';
import { User as UserEntity } from '../user/entities/user.entity';
import { TenantMember as TenantMemberEntity } from './entities/tenant_member.entity';
import { SafeTenantMember, SafeTenantMemberSchema } from './tenant_member.types';
import { SafeUserSchema } from '../user/user.types';
import { CreateTenantMemberInput, UpdateTenantMemberInput, GetTenantMembersInput, GetTenantMemberInput } from './tenant_member.dto';
import TenantMemberMessages from './tenant_member.messages';
import type { TenantMemberRole } from './tenant_member.enums';
import WebhookService from '@/modules/webhook/webhook.service';
import { AppError, ErrorCode } from '@/modules/common/app-error';

export default class TenantMemberService {

  private static readonly ROLE_HIERARCHY: TenantMemberRole[] = ['OWNER', 'ADMIN', 'USER'];

  static async getByTenantId({ tenantId, page, pageSize, search, memberRole, memberStatus }: GetTenantMembersInput): Promise<{ members: SafeTenantMember[]; total: number }> {
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

  static async getById(tenantMemberId: string, tenantId: string): Promise<SafeTenantMember> {
    const ds = await tenantDataSourceFor(tenantId);
    const member = await ds.getRepository(TenantMemberEntity).findOne({ where: { tenantMemberId, tenantId, deletedAt: IsNull() } });
    if (!member) throw new AppError(TenantMemberMessages.MEMBER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return SafeTenantMemberSchema.parse(member);
  }

  static async getByTenantAndUser({ tenantMemberId, tenantId, userId }: GetTenantMemberInput): Promise<SafeTenantMember | null> {
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

  static async create(data: CreateTenantMemberInput): Promise<SafeTenantMember> {
    const ds = await tenantDataSourceFor(data.tenantId);
    const repo = ds.getRepository(TenantMemberEntity);
    const existing = await repo.findOne({ where: { tenantId: data.tenantId, userId: data.userId, deletedAt: IsNull() } });
    if (existing) throw new AppError(TenantMemberMessages.MEMBER_ALREADY_EXISTS, 409, ErrorCode.CONFLICT);

    const member = repo.create(data as Partial<TenantMemberEntity>);
    const saved = await repo.save(member);
    await WebhookService.dispatchEvent(saved.tenantId, 'member.created', {
      tenantMemberId: saved.tenantMemberId,
      userId: saved.userId,
      memberRole: saved.memberRole,
    });
    return SafeTenantMemberSchema.parse(saved);
  }

  static async update(tenantMemberId: string, tenantId: string, data: UpdateTenantMemberInput): Promise<SafeTenantMember> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantMemberEntity);
    const member = await repo.findOne({ where: { tenantMemberId, tenantId, deletedAt: IsNull() } });
    if (!member) throw new AppError(TenantMemberMessages.MEMBER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    if (member.memberRole === 'OWNER' && data.memberRole && data.memberRole !== 'OWNER') {
      const ownerCount = await repo.count({ where: { tenantId, memberRole: 'OWNER', deletedAt: IsNull() } });
      if (ownerCount <= 1) throw new AppError(TenantMemberMessages.CANNOT_DEMOTE_OWNER, 409, ErrorCode.CONFLICT);
    }

    const updateData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null));
    await ds.transaction(async (mgr) => {
      const txRepo = mgr.getRepository(TenantMemberEntity);
      await txRepo.update({ tenantMemberId, tenantId }, updateData as Partial<TenantMemberEntity>);
      await txRepo.increment({ tenantMemberId, tenantId }, 'sessionVersion', 1);
    });
    await redis.del(`tenant:member:${member.userId}:${tenantId}`).catch(() => {});
    const updated = await repo.findOne({ where: { tenantMemberId, tenantId } });
    await WebhookService.dispatchEvent(tenantId, 'member.updated', {
      tenantMemberId,
      userId: updated!.userId,
      memberRole: updated!.memberRole,
    });
    return SafeTenantMemberSchema.parse(updated!);
  }

  static async delete(tenantMemberId: string, tenantId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantMemberEntity);
    const member = await repo.findOne({ where: { tenantMemberId, tenantId, deletedAt: IsNull() } });
    if (!member) throw new AppError(TenantMemberMessages.MEMBER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    if (member.memberRole === 'OWNER') {
      const ownerCount = await repo.count({ where: { tenantId, memberRole: 'OWNER', deletedAt: IsNull() } });
      if (ownerCount <= 1) throw new AppError(TenantMemberMessages.LAST_OWNER, 409, ErrorCode.CONFLICT);
    }

    await repo.update({ tenantMemberId, tenantId }, { deletedAt: new Date() });
    await WebhookService.dispatchEvent(tenantId, 'member.deleted', {
      tenantMemberId,
      userId: member.userId,
    });
  }

  static async getUserTenants(userId: string): Promise<SafeTenantMember[]> {
    const ds = await getDataSource();
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
