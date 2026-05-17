import 'reflect-metadata';
import { IsNull, ILike } from 'typeorm';
import { tenantDataSourceFor, getDefaultTenantDataSource } from '@/modules/db';
import redis from '@/modules/redis';
import { env } from '@/modules/env';
import { Tenant as TenantEntity } from './entities/tenant.entity';
import { SafeTenant, SafeTenantSchema } from './tenant.types';
import { CreateTenantInput, UpdateTenantInput, GetTenantsInput } from './tenant.dto';
import TenantMessages from './tenant.messages';
import TenantMemberService from '../tenant_member/tenant_member.service';
import Logger from '@/modules/logger';

const TENANT_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

export default class TenantService {

  private static async clearCache(tenantId: string) {
    await redis.del(`tenant:id:${tenantId}`).catch(() => {});
  }

  static async getAll({ page, pageSize, search, tenantId }: GetTenantsInput): Promise<{ tenants: SafeTenant[]; total: number }> {
    const ds = await getDefaultTenantDataSource();
    const repo = ds.getRepository(TenantEntity);

    const baseWhere: Record<string, unknown> = { deletedAt: IsNull() };
    if (tenantId) baseWhere.tenantId = tenantId;

    let whereConditions: Record<string, unknown>[];
    if (search) {
      whereConditions = [{ ...baseWhere, name: ILike(`%${search}%`) }];
    } else {
      whereConditions = [baseWhere];
    }

    Logger.info(`[TenantService] Querying tenants`);

    const [tenants, total] = await Promise.all([
      repo.find({ where: whereConditions as any, skip: page * pageSize, take: pageSize, order: { createdAt: 'DESC' } }),
      repo.count({ where: whereConditions as any }),
    ]);

    return { tenants: tenants.map((t) => SafeTenantSchema.parse(t)), total };
  }

  static async getById(tenantId: string): Promise<SafeTenant> {
    const cacheKey = `tenant:id:${tenantId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return SafeTenantSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    const ds = await tenantDataSourceFor(tenantId);
    const tenant = await ds.getRepository(TenantEntity).findOne({ where: { tenantId, deletedAt: IsNull() } });
    if (!tenant) throw new Error(TenantMessages.TENANT_NOT_FOUND);

    const parsed = SafeTenantSchema.parse(tenant);
    await redis.setex(cacheKey, TENANT_CACHE_TTL, JSON.stringify(parsed)).catch(() => {});
    return parsed;
  }

  static async create(data: CreateTenantInput): Promise<SafeTenant> {
    const ds = await getDefaultTenantDataSource();
    const repo = ds.getRepository(TenantEntity);
    const tenant = repo.create({ ...data, tenantStatus: 'ACTIVE' } as any);
    const saved = await repo.save(tenant);
    return SafeTenantSchema.parse(saved);
  }

  static async update(tenantId: string, data: UpdateTenantInput): Promise<SafeTenant> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantEntity);
    const tenant = await repo.findOne({ where: { tenantId, deletedAt: IsNull() } });
    if (!tenant) throw new Error(TenantMessages.TENANT_NOT_FOUND);

    await repo.update({ tenantId }, data as any);
    const updated = await repo.findOne({ where: { tenantId } });
    await this.clearCache(tenantId);
    return SafeTenantSchema.parse(updated!);
  }

  static async provisionPersonal(userId: string, email: string): Promise<SafeTenant> {
    const name = email.split('@')[0];
    const ds = await getDefaultTenantDataSource();
    const repo = ds.getRepository(TenantEntity);
    const tenant = repo.create({ name, tenantStatus: 'ACTIVE' });
    const saved = await repo.save(tenant);

    await TenantMemberService.create({
      tenantId: saved.tenantId,
      userId,
      memberRole: 'OWNER',
      memberStatus: 'ACTIVE',
    });

    return SafeTenantSchema.parse(saved);
  }

  static async delete(tenantId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantEntity);
    const tenant = await repo.findOne({ where: { tenantId, deletedAt: IsNull() } });
    if (!tenant) throw new Error(TenantMessages.TENANT_NOT_FOUND);
    await repo.update({ tenantId }, { deletedAt: new Date() });
    await this.clearCache(tenantId);
  }
}
