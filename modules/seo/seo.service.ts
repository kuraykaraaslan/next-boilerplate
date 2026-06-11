import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { SeoMeta as SeoMetaEntity } from './entities/seo_meta.entity';
import { SeoMetaSchema, type SeoMeta } from './seo.types';
import type { UpsertSeoDTO } from './seo.dto';
import { SEO_MESSAGES } from './seo.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';

const SEO_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

function cacheKey(tenantId: string, entityType: string, entityId: string) {
  return `seo:${tenantId}:${entityType}:${entityId}`;
}

export default class SeoService {
  static async upsert(
    tenantId: string,
    entityType: string,
    entityId: string,
    dto: UpsertSeoDTO,
  ): Promise<SeoMeta> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(SeoMetaEntity);
      let row = await repo.findOne({ where: { tenantId, entityType, entityId } });
      if (row) {
        Object.assign(row, dto);
      } else {
        row = repo.create({ tenantId, entityType, entityId, ...dto });
      }
      const saved = await repo.save(row);
      await redis.del(cacheKey(tenantId, entityType, entityId)).catch(() => {});
      return SeoMetaSchema.parse(saved);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(SEO_MESSAGES.UPSERT_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async get(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<SeoMeta | null> {
    const key = cacheKey(tenantId, entityType, entityId);
    const cached = await redis.get(key).catch(() => null);
    if (cached) {
      try { return SeoMetaSchema.parse(JSON.parse(cached)); } catch { await redis.del(key).catch(() => {}); }
    }

    return singleFlight(key, async () => {
      const ds = await tenantDataSourceFor(tenantId);
      const row = await ds.getRepository(SeoMetaEntity)
        .findOne({ where: { tenantId, entityType, entityId } });
      if (!row) return null;
      const parsed = SeoMetaSchema.parse(row);
      await redis.setex(key, jitter(SEO_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  static async delete(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    await ds.getRepository(SeoMetaEntity).delete({ tenantId, entityType, entityId });
    await redis.del(cacheKey(tenantId, entityType, entityId)).catch(() => {});
  }
}
