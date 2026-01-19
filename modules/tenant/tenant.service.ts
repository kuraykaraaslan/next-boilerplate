import { AppDataSource } from "@/libs/typeorm";
import { TenantEntity } from "./tenant.entity";
import { SafeTenant, SafeTenantSchema } from "./tenant.types";
import { CreateTenantInput, UpdateTenantInput, GetTenantsInput } from "./tenant.dto";
import TenantMessages from "./tenant.messages";

export default class TenantService {

  private static get repository() {
    return AppDataSource.getRepository(TenantEntity);
  }

  static async getAll({ page, pageSize, search, tenantId }: GetTenantsInput): Promise<{ tenants: SafeTenant[], total: number }> {
    const queryBuilder = this.repository.createQueryBuilder('tenant');

    if (tenantId) {
      queryBuilder.andWhere('tenant.tenantId = :tenantId', { tenantId });
    }

    if (search) {
      queryBuilder.andWhere(
        'tenant.name ILIKE :search',
        { search: `%${search}%` }
      );
    }

    const [tenants, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .orderBy('tenant.createdAt', 'DESC')
      .getManyAndCount();

    return {
      tenants: tenants.map(tenant => SafeTenantSchema.parse(tenant)),
      total
    };
  }

  static async getById(tenantId: string): Promise<SafeTenant> {
    const tenant = await this.repository.findOne({
      where: { tenantId }
    });

    if (!tenant) {
      throw new Error(TenantMessages.TENANT_NOT_FOUND);
    }

    return SafeTenantSchema.parse(tenant);
  }

  static async create(data: CreateTenantInput): Promise<SafeTenant> {

    const tenant = this.repository.create({
      ...data,
      tenantStatus: 'ACTIVE'
    });

    const saved = await this.repository.save(tenant);
    return SafeTenantSchema.parse(saved);
  }

  static async update(tenantId: string, data: UpdateTenantInput): Promise<SafeTenant> {
    const tenant = await this.repository.findOne({
      where: { tenantId }
    });

    if (!tenant) {
      throw new Error(TenantMessages.TENANT_NOT_FOUND);
    }

    await this.repository.update({ tenantId }, data);

    const updated = await this.repository.findOne({
      where: { tenantId }
    });

    return SafeTenantSchema.parse(updated);
  }

  static async delete(tenantId: string): Promise<void> {
    const tenant = await this.repository.findOne({
      where: { tenantId }
    });

    if (!tenant) {
      throw new Error(TenantMessages.TENANT_NOT_FOUND);
    }

    await this.repository.softDelete({ tenantId });
  }
}
