import { prisma } from "@/libs/prisma";
import type { Prisma } from "@/prisma/client";
import { SafeTenant, SafeTenantSchema } from "./tenant.types";
import { CreateTenantInput, UpdateTenantInput, GetTenantsInput } from "./tenant.dto";
import TenantMessages from "./tenant.messages";

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

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.tenant.count({ where })
    ]);

    return {
      tenants: tenants.map(tenant => SafeTenantSchema.parse(tenant)),
      total
    };
  }

  static async getById(tenantId: string): Promise<SafeTenant> {
    const tenant = await prisma.tenant.findFirst({
      where: { tenantId, deletedAt: null }
    });

    if (!tenant) {
      throw new Error(TenantMessages.TENANT_NOT_FOUND);
    }

    return SafeTenantSchema.parse(tenant);
  }

  static async create(data: CreateTenantInput): Promise<SafeTenant> {
    const tenant = await prisma.tenant.create({
      data: {
        ...data,
        tenantStatus: 'ACTIVE'
      }
    });

    return SafeTenantSchema.parse(tenant);
  }

  static async update(tenantId: string, data: UpdateTenantInput): Promise<SafeTenant> {
    const tenant = await prisma.tenant.findFirst({
      where: { tenantId, deletedAt: null }
    });

    if (!tenant) {
      throw new Error(TenantMessages.TENANT_NOT_FOUND);
    }

    const updated = await prisma.tenant.update({
      where: { tenantId },
      data
    });

    return SafeTenantSchema.parse(updated);
  }

  static async delete(tenantId: string): Promise<void> {
    const tenant = await prisma.tenant.findFirst({
      where: { tenantId, deletedAt: null }
    });

    if (!tenant) {
      throw new Error(TenantMessages.TENANT_NOT_FOUND);
    }

    // Soft delete
    await prisma.tenant.update({
      where: { tenantId },
      data: { deletedAt: new Date() }
    });
  }
}
