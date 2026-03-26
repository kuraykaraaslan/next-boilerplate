import { tenantPrisma, tenantPrismaFor } from "@/libs/prisma";
import type { Prisma } from "@/prisma/tenant/client";
import { SafeTenant, SafeTenantSchema } from "./tenant.types";
import { CreateTenantInput, UpdateTenantInput, GetTenantsInput } from "./tenant.dto";
import TenantMessages from "./tenant.messages";
import TenantMemberService from "../tenant_member/tenant_member.service";

export default class TenantService {

  static async getAll({ page, pageSize, search, tenantId }: GetTenantsInput): Promise<{ tenants: SafeTenant[], total: number }> {
    const where: Prisma.TenantWhereInput = {
      deletedAt: null
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    console.log('Querying tenants with where clause:', where);

    const [tenants, total] = await Promise.all([
      tenantPrisma.tenant.findMany({
        where,
        skip: (page) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      tenantPrisma.tenant.count({ where })
    ]);

    return {
      tenants: tenants.map(tenant => SafeTenantSchema.parse(tenant)),
      total
    };
  }

  static async getById(tenantId: string): Promise<SafeTenant> {
    const db = await tenantPrismaFor(tenantId);
    const tenant = await db.tenant.findFirst({
      where: { tenantId, deletedAt: null }
    });

    if (!tenant) {
      throw new Error(TenantMessages.TENANT_NOT_FOUND);
    }

    return SafeTenantSchema.parse(tenant);
  }

  static async create(data: CreateTenantInput): Promise<SafeTenant> {
    const tenant = await tenantPrisma.tenant.create({
      data: {
        ...data,
        tenantStatus: 'ACTIVE'
      }
    });

    return SafeTenantSchema.parse(tenant);
  }

  static async update(tenantId: string, data: UpdateTenantInput): Promise<SafeTenant> {
    const db = await tenantPrismaFor(tenantId);
    const tenant = await db.tenant.findFirst({
      where: { tenantId, deletedAt: null }
    });

    if (!tenant) {
      throw new Error(TenantMessages.TENANT_NOT_FOUND);
    }

    const updated = await db.tenant.update({
      where: { tenantId },
      data
    });

    return SafeTenantSchema.parse(updated);
  }

  /**
   * Create a personal tenant for a newly registered user and assign them as OWNER.
   */
  static async provisionPersonal(userId: string, email: string): Promise<SafeTenant> {
    const name = email.split("@")[0];

    const tenant = await tenantPrisma.tenant.create({
      data: {
        name,
        tenantStatus: "ACTIVE",
      },
    });

    await TenantMemberService.create({
      tenantId: tenant.tenantId,
      userId,
      memberRole: "OWNER",
      memberStatus: "ACTIVE",
    });

    return SafeTenantSchema.parse(tenant);
  }

  static async delete(tenantId: string): Promise<void> {
    const db = await tenantPrismaFor(tenantId);
    const tenant = await db.tenant.findFirst({
      where: { tenantId, deletedAt: null }
    });

    if (!tenant) {
      throw new Error(TenantMessages.TENANT_NOT_FOUND);
    }

    // Soft delete
    await db.tenant.update({
      where: { tenantId },
      data: { deletedAt: new Date() }
    });
  }
}
