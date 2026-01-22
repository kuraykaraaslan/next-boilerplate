import { prisma } from "@/libs/prisma";
import type { Prisma } from "@/prisma/client";
import { SafeTenantMember, SafeTenantMemberSchema } from "./tenant_member.types";
import { CreateTenantMemberInput, UpdateTenantMemberInput, GetTenantMembersInput, GetTenantMemberInput } from "./tenant_member.dto";
import TenantMemberMessages from "./tenant_member.messages";
import type { TenantMemberRole } from "./tenant_member.enums";

export default class TenantMemberService {

  private static readonly ROLE_HIERARCHY: TenantMemberRole[] = ['OWNER', 'ADMIN', 'USER'];

  static async getByTenantId({ tenantId, page, pageSize, search, memberRole, memberStatus }: GetTenantMembersInput): Promise<{ members: SafeTenantMember[], total: number }> {
    const where: Prisma.TenantMemberWhereInput = {
      tenantId,
      deletedAt: null
    };

    if (memberRole) {
      where.memberRole = memberRole;
    }

    if (memberStatus) {
      where.memberStatus = memberStatus;
    }

    if (search) {
      where.user = {
        email: { contains: search, mode: 'insensitive' }
      };
    }

    const [members, total] = await Promise.all([
      prisma.tenantMember.findMany({
        where,
        include: { user: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.tenantMember.count({ where })
    ]);

    return {
      members: members.map(member => SafeTenantMemberSchema.parse(member)),
      total
    };
  }

  static async getById(tenantMemberId: string): Promise<SafeTenantMember> {
    const member = await prisma.tenantMember.findFirst({
      where: { tenantMemberId, deletedAt: null }
    });

    if (!member) {
      throw new Error(TenantMemberMessages.MEMBER_NOT_FOUND);
    }

    return SafeTenantMemberSchema.parse(member);
  }

  static async getByTenantAndUser({ tenantMemberId,tenantId, userId }: GetTenantMemberInput): Promise<SafeTenantMember | null> {
    if (tenantMemberId) {
      const member = await prisma.tenantMember.findFirst({
        where: { tenantMemberId, deletedAt: null }
      });

      if (!member) {
        return null;
      }

      if (member.tenantId !== tenantId || member.userId !== userId) {
        return null;
      }
      return member ? SafeTenantMemberSchema.parse(member) : null;
    }

    if (!tenantId || !userId) {
      return null;
    }

    const member = await prisma.tenantMember.findFirst({
      where: { tenantId, userId, deletedAt: null }
    });

    return member ? SafeTenantMemberSchema.parse(member) : null;
  }

  static async create(data: CreateTenantMemberInput): Promise<SafeTenantMember> {
    const existing = await prisma.tenantMember.findFirst({
      where: { tenantId: data.tenantId, userId: data.userId, deletedAt: null }
    });

    if (existing) {
      throw new Error(TenantMemberMessages.MEMBER_ALREADY_EXISTS);
    }

    const member = await prisma.tenantMember.create({
      data
    });

    return SafeTenantMemberSchema.parse(member);
  }

  static async update(tenantMemberId: string, data: UpdateTenantMemberInput): Promise<SafeTenantMember> {
    const member = await prisma.tenantMember.findFirst({
      where: { tenantMemberId, deletedAt: null }
    });

    if (!member) {
      throw new Error(TenantMemberMessages.MEMBER_NOT_FOUND);
    }

    if (member.memberRole === 'OWNER' && data.memberRole && data.memberRole !== 'OWNER') {
      const ownerCount = await prisma.tenantMember.count({
        where: { tenantId: member.tenantId, memberRole: 'OWNER', deletedAt: null }
      });

      if (ownerCount <= 1) {
        throw new Error(TenantMemberMessages.CANNOT_DEMOTE_OWNER);
      }
    }

    const updateData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== null)
    ) as Prisma.TenantMemberUpdateInput;

    const updated = await prisma.tenantMember.update({
      where: { tenantMemberId },
      data: updateData
    });

    return SafeTenantMemberSchema.parse(updated);
  }

  static async delete(tenantMemberId: string): Promise<void> {
    const member = await prisma.tenantMember.findFirst({
      where: { tenantMemberId, deletedAt: null }
    });

    if (!member) {
      throw new Error(TenantMemberMessages.MEMBER_NOT_FOUND);
    }

    if (member.memberRole === 'OWNER') {
      const ownerCount = await prisma.tenantMember.count({
        where: { tenantId: member.tenantId, memberRole: 'OWNER', deletedAt: null }
      });

      if (ownerCount <= 1) {
        throw new Error(TenantMemberMessages.LAST_OWNER);
      }
    }

    // Soft delete
    await prisma.tenantMember.update({
      where: { tenantMemberId },
      data: { deletedAt: new Date() }
    });
  }

  static async getUserTenants(userId: string): Promise<SafeTenantMember[]> {
    const members = await prisma.tenantMember.findMany({
      where: { userId, memberStatus: 'ACTIVE', deletedAt: null },
      include: { tenant: true }
    });

    return members.map(member => SafeTenantMemberSchema.parse(member));
  }

  static hasRole(member: SafeTenantMember, requiredRole: TenantMemberRole): boolean {
    const memberRoleIndex = this.ROLE_HIERARCHY.indexOf(member.memberRole);
    const requiredRoleIndex = this.ROLE_HIERARCHY.indexOf(requiredRole);

    return memberRoleIndex <= requiredRoleIndex;
  }

  static async checkPermission(tenantId: string, userId: string, requiredRole: TenantMemberRole): Promise<boolean> {
    const member = await prisma.tenantMember.findFirst({
      where: { tenantId, userId, memberStatus: 'ACTIVE', deletedAt: null }
    });

    if (!member) {
      return false;
    }

    return this.hasRole(SafeTenantMemberSchema.parse(member), requiredRole);
  }
}
