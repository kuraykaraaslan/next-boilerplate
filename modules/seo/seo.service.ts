import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import redis, { singleFlight } from '@/modules/redis';
import { SeoMeta as SeoMetaEntity } from './entities/seo_meta.entity';
import { SeoMetaSchema, type SeoMeta } from './seo.types';
import type { UpsertSeoDTO } from './seo.dto';

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
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SeoMetaEntity);
    let row = await repo.findOne({ where: { tenantId, entityType, entityId } });
    if (row) {
      Object.assign(row, dto);
    } else {
      row = repo.create({ tenantId, entityType, entityId, ...dto });
    }
    const saved = await repo.save(row);
    await redis.del(cacheKey(tenantId, entityType, entityId));
    return SeoMetaSchema.parse(saved);
  }

  static async get(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<SeoMeta | null> {
    return singleFlight(cacheKey(tenantId, entityType, entityId), async () => {
      const ds = await tenantDataSourceFor(tenantId);
      const row = await ds.getRepository(SeoMetaEntity)
        .findOne({ where: { tenantId, entityType, entityId } });
      if (!row) return null;
      return SeoMetaSchema.parse(row);
    });
  }

  static async delete(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    await ds.getRepository(SeoMetaEntity).delete({ tenantId, entityType, entityId });
    await redis.del(cacheKey(tenantId, entityType, entityId));
  }
}
