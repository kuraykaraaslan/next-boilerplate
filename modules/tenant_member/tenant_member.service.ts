import { AppDataSource } from "@/libs/typeorm";
import { TenantMemberEntity } from "./tenant_member.entity";
import { SafeTenantMember, SafeTenantMemberSchema } from "./tenant_member.types";
import { CreateTenantMemberInput, UpdateTenantMemberInput, GetTenantMembersInput, GetTenantMemberInput } from "./tenant_member.dto";
import TenantMemberMessages from "./tenant_member.messages";
import type { TenantMemberRole } from "./tenant_member.enums";

export default class TenantMemberService {

  private static get repository() {
    return AppDataSource.getRepository(TenantMemberEntity);
  }

  private static readonly ROLE_HIERARCHY: TenantMemberRole[] = ['OWNER', 'ADMIN', 'USER'];

  static async getByTenantId({ tenantId, page, pageSize, search, memberRole, memberStatus }: GetTenantMembersInput): Promise<{ members: SafeTenantMember[], total: number }> {
    const queryBuilder = this.repository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.tenantId = :tenantId', { tenantId });

    if (memberRole) {
      queryBuilder.andWhere('member.memberRole = :memberRole', { memberRole });
    }

    if (memberStatus) {
      queryBuilder.andWhere('member.memberStatus = :memberStatus', { memberStatus });
    }

    if (search) {
      queryBuilder.andWhere('user.email ILIKE :search', { search: `%${search}%` });
    }

    const [members, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .orderBy('member.createdAt', 'DESC')
      .getManyAndCount();

    return {
      members: members.map(member => SafeTenantMemberSchema.parse(member)),
      total
    };
  }

  static async getById(tenantMemberId: string): Promise<SafeTenantMember> {
    const member = await this.repository.findOne({
      where: { tenantMemberId }
    });

    if (!member) {
      throw new Error(TenantMemberMessages.MEMBER_NOT_FOUND);
    }

    return SafeTenantMemberSchema.parse(member);
  }

  static async getByTenantAndUser({ tenantMemberId, tenantId, userId }: GetTenantMemberInput): Promise<SafeTenantMember | null> {
    if (tenantMemberId) {
      const member = await this.repository.findOne({
        where: { tenantMemberId }
      });
      return member ? SafeTenantMemberSchema.parse(member) : null;
    }

    const member = await this.repository.findOne({
      where: { tenantId, userId }
    });

    return member ? SafeTenantMemberSchema.parse(member) : null;
  }

  static async create(data: CreateTenantMemberInput): Promise<SafeTenantMember> {
    const existing = await this.repository.findOne({
      where: { tenantId: data.tenantId, userId: data.userId }
    });

    if (existing) {
      throw new Error(TenantMemberMessages.MEMBER_ALREADY_EXISTS);
    }

    const member = this.repository.create(data);
    const saved = await this.repository.save(member);

    return SafeTenantMemberSchema.parse(saved);
  }

  static async update(tenantMemberId: string, data: UpdateTenantMemberInput): Promise<SafeTenantMember> {
    const member = await this.repository.findOne({
      where: { tenantMemberId }
    });

    if (!member) {
      throw new Error(TenantMemberMessages.MEMBER_NOT_FOUND);
    }

    if (member.memberRole === 'OWNER' && data.memberRole && data.memberRole !== 'OWNER') {
      const ownerCount = await this.repository.count({
        where: { tenantId: member.tenantId, memberRole: 'OWNER' }
      });

      if (ownerCount <= 1) {
        throw new Error(TenantMemberMessages.CANNOT_DEMOTE_OWNER);
      }
    }

    await this.repository.update({ tenantMemberId }, data);

    const updated = await this.repository.findOne({
      where: { tenantMemberId }
    });

    return SafeTenantMemberSchema.parse(updated);
  }

  static async delete(tenantMemberId: string): Promise<void> {
    const member = await this.repository.findOne({
      where: { tenantMemberId }
    });

    if (!member) {
      throw new Error(TenantMemberMessages.MEMBER_NOT_FOUND);
    }

    if (member.memberRole === 'OWNER') {
      const ownerCount = await this.repository.count({
        where: { tenantId: member.tenantId, memberRole: 'OWNER' }
      });

      if (ownerCount <= 1) {
        throw new Error(TenantMemberMessages.LAST_OWNER);
      }
    }

    await this.repository.softDelete({ tenantMemberId });
  }

  static async getUserTenants(userId: string): Promise<SafeTenantMember[]> {
    const members = await this.repository.find({
      where: { userId, memberStatus: 'ACTIVE' },
      relations: ['tenant']
    });

    return members.map(member => SafeTenantMemberSchema.parse(member));
  }

  static hasRole(member: SafeTenantMember, requiredRole: TenantMemberRole): boolean {
    const memberRoleIndex = this.ROLE_HIERARCHY.indexOf(member.memberRole);
    const requiredRoleIndex = this.ROLE_HIERARCHY.indexOf(requiredRole);

    return memberRoleIndex <= requiredRoleIndex;
  }

  static async checkPermission(tenantId: string, userId: string, requiredRole: TenantMemberRole): Promise<boolean> {
    const member = await this.repository.findOne({
      where: { tenantId, userId, memberStatus: 'ACTIVE' }
    });

    if (!member) {
      return false;
    }

    return this.hasRole(SafeTenantMemberSchema.parse(member), requiredRole);
  }
}
