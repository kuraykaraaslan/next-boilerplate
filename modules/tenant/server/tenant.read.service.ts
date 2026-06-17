import 'reflect-metadata';
import { IsNull, ILike } from 'typeorm';
import { tenantDataSourceFor, getDataSource } from '@kuraykaraaslan/db';
import redis, { jitter, singleFlight } from '@kuraykaraaslan/redis';
import { Tenant as TenantEntity } from './entities/tenant.entity';
import { SafeTenant, SafeTenantSchema } from './tenant.types';
import { GetTenantsInput } from './tenant.dto';
import TenantMessages from './tenant.messages';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { TENANT_CACHE_TTL } from './tenant.helpers';

export async function getAll({ page, pageSize, search, tenantId }: GetTenantsInput): Promise<{ tenants: SafeTenant[]; total: number }> {
  const ds = await getDataSource();
  const repo = ds.getRepository(TenantEntity);

  const baseWhere: Record<string, unknown> = { deletedAt: IsNull() };
  if (tenantId) baseWhere.tenantId = tenantId;

  let whereConditions: Record<string, unknown>[];
  if (search) {
    whereConditions = [{ ...baseWhere, name: ILike(`%${search}%`) }];
  } else {
    whereConditions = [baseWhere];
  }

  const [tenants, total] = await Promise.all([
    repo.find({ where: whereConditions as any, skip: page * pageSize, take: pageSize, order: { createdAt: 'DESC' } }),
    repo.count({ where: whereConditions as any }),
  ]);

  return { tenants: tenants.map((t) => SafeTenantSchema.parse(t)), total };
}

export async function getById(tenantId: string): Promise<SafeTenant> {
  const cacheKey = `tenant:id:${tenantId}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    try { return SafeTenantSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
  }

  return singleFlight(cacheKey, async () => {
    const ds = await tenantDataSourceFor(tenantId);
    const tenant = await ds.getRepository(TenantEntity).findOne({ where: { tenantId, deletedAt: IsNull() } });
    if (!tenant) throw new AppError(TenantMessages.TENANT_NOT_FOUND, 404, ErrorCode.TENANT_NOT_FOUND);

    const parsed = SafeTenantSchema.parse(tenant);
    await redis.setex(cacheKey, jitter(TENANT_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
    return parsed;
  });
}

export async function getBySlug(slug: string): Promise<SafeTenant> {
  const ds = await getDataSource();
  const tenant = await ds.getRepository(TenantEntity).findOne({ where: { slug, deletedAt: IsNull() } });
  if (!tenant) throw new AppError(TenantMessages.TENANT_NOT_FOUND, 404, ErrorCode.TENANT_NOT_FOUND);
  return SafeTenantSchema.parse(tenant);
}
