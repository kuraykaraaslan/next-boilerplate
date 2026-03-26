import { systemPrisma, tenantPrisma, tenantPrismaFor } from "@/libs/prisma";
import type { Prisma } from "@/prisma/tenant/client";
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

    if (memberRole) where.memberRole = memberRole;
    if (memberStatus) where.memberStatus = memberStatus;

    // Cross-DB: resolve email search via system DB
    if (search) {
      const matchingUsers = await systemPrisma.user.findMany({
        where: { email: { contains: search, mode: 'insensitive' } },
        select: { userId: true }
      });
      const matchingIds = matchingUsers.map(u => u.userId);
      if (matchingIds.length === 0) return { members: [], total: 0 };
      where.userId = { in: matchingIds };
    }

    const safePage = Math.max(1, page);

    const db = await tenantPrismaFor(tenantId);
    const [members, total] = await Promise.all([
      db.tenantMember.findMany({
        where,
        skip: (safePage - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      db.tenantMember.count({ where })
    ]);

    // Hydrate user data from system DB
    const userIds = members.map(m => m.userId);
    const users = await systemPrisma.user.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, email: true, phone: true, userRole: true, userStatus: true, emailVerifiedAt: true, createdAt: true, updatedAt: true }
    });
    const userMap = Object.fromEntries(users.map(u => [u.userId, u]));

    return {
      members: members.map(member => ({
        ...SafeTenantMemberSchema.parse(member),
        user: userMap[member.userId]
      })),
      total
    };
  }

  static async getById(tenantMemberId: string): Promise<SafeTenantMember> {
    const member = await tenantPrisma.tenantMember.findFirst({
      where: { tenantMemberId, deletedAt: null }
    });

    if (!member) throw new Error(TenantMemberMessages.MEMBER_NOT_FOUND);
    return SafeTenantMemberSchema.parse(member);
  }

  static async getByTenantAndUser({ tenantMemberId, tenantId, userId }: GetTenantMemberInput): Promise<SafeTenantMember | null> {
    if (tenantMemberId) {
      const member = await tenantPrisma.tenantMember.findFirst({
        where: { tenantMemberId, deletedAt: null }
      });
      if (!member) return null;
      if (member.tenantId !== tenantId || member.userId !== userId) return null;
      return SafeTenantMemberSchema.parse(member);
    }

    if (!tenantId || !userId) return null;

    const db = await tenantPrismaFor(tenantId);
    const member = await db.tenantMember.findFirst({
      where: { tenantId, userId, deletedAt: null }
    });
    return member ? SafeTenantMemberSchema.parse(member) : null;
  }

  static async create(data: CreateTenantMemberInput): Promise<SafeTenantMember> {
    const db = await tenantPrismaFor(data.tenantId);
    const existing = await db.tenantMember.findFirst({
      where: { tenantId: data.tenantId, userId: data.userId, deletedAt: null }
    });

    if (existing) throw new Error(TenantMemberMessages.MEMBER_ALREADY_EXISTS);

    const member = await db.tenantMember.create({ data });
    return SafeTenantMemberSchema.parse(member);
  }

  static async update(tenantMemberId: string, data: UpdateTenantMemberInput): Promise<SafeTenantMember> {
    const member = await tenantPrisma.tenantMember.findFirst({
      where: { tenantMemberId, deletedAt: null }
    });

    if (!member) throw new Error(TenantMemberMessages.MEMBER_NOT_FOUND);

    const db = await tenantPrismaFor(member.tenantId);

    if (member.memberRole === 'OWNER' && data.memberRole && data.memberRole !== 'OWNER') {
      const ownerCount = await db.tenantMember.count({
        where: { tenantId: member.tenantId, memberRole: 'OWNER', deletedAt: null }
      });
      if (ownerCount <= 1) throw new Error(TenantMemberMessages.CANNOT_DEMOTE_OWNER);
    }

    const updateData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== null)
    ) as Prisma.TenantMemberUpdateInput;

    const updated = await db.tenantMember.update({
      where: { tenantMemberId },
      data: updateData
    });

    return SafeTenantMemberSchema.parse(updated);
  }

  static async delete(tenantMemberId: string): Promise<void> {
    const member = await tenantPrisma.tenantMember.findFirst({
      where: { tenantMemberId, deletedAt: null }
    });

    if (!member) throw new Error(TenantMemberMessages.MEMBER_NOT_FOUND);

    const db = await tenantPrismaFor(member.tenantId);

    if (member.memberRole === 'OWNER') {
      const ownerCount = await db.tenantMember.count({
        where: { tenantId: member.tenantId, memberRole: 'OWNER', deletedAt: null }
      });
      if (ownerCount <= 1) throw new Error(TenantMemberMessages.LAST_OWNER);
    }

    await db.tenantMember.update({
      where: { tenantMemberId },
      data: { deletedAt: new Date() }
    });
  }

  static async getUserTenants(userId: string): Promise<SafeTenantMember[]> {
    const members = await tenantPrisma.tenantMember.findMany({
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
    const db = await tenantPrismaFor(tenantId);
    const member = await db.tenantMember.findFirst({
      where: { tenantId, userId, memberStatus: 'ACTIVE', deletedAt: null }
    });
    if (!member) return false;
    return this.hasRole(SafeTenantMemberSchema.parse(member), requiredRole);
  }
}
