import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import redis, { jitter, singleFlight } from '@kuraykaraaslan/redis';
import { env } from '@kuraykaraaslan/env';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { SeoMeta as SeoMetaEntity } from './entities/seo_meta.entity';
import { SeoMetaSchema, type SeoMeta } from './seo.types';
import type { UpsertSeoDTO } from './seo.dto';
import { SEO_MESSAGES } from './seo.messages';
import SeoRenderService, { type SitemapUrlEntry } from './seo.render.service';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';

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

  // ── Settings-aware rendering helpers ───────────────────────────────────────

  /**
   * Generate the tenant's `robots.txt`, honouring the `metaRobots` and
   * `sitemapEnabled` settings and pointing at the tenant's sitemap URL.
   */
  static async getRobotsTxt(tenantId: string, opts?: { baseUrl?: string }): Promise<string> {
    const s = await SettingService.getByKeys(tenantId, ['metaRobots', 'sitemapEnabled', 'siteBaseUrl', 'robotsDisallow'])
      .catch(() => ({} as Record<string, string>));
    const base = (opts?.baseUrl ?? s.siteBaseUrl ?? '').replace(/\/$/, '');
    const sitemapEnabled = s.sitemapEnabled !== 'false';
    const disallow = (s.robotsDisallow ?? '').split(',').map((d) => d.trim()).filter(Boolean);
    return SeoRenderService.robotsTxt({
      metaRobots: s.metaRobots,
      disallow: disallow.length > 0 ? disallow : undefined,
      sitemapUrl: sitemapEnabled && base ? `${base}/sitemap.xml` : null,
      host: base || null,
    });
  }

  /**
   * Build a tenant sitemap (or sitemap index when the URL count exceeds the
   * per-file limit). Returns either a single `urlset` or an index referencing
   * page-level sitemaps; callers serve the chosen file.
   */
  static buildSitemap(entries: SitemapUrlEntry[], opts?: { baseUrl?: string; page?: number }): { kind: 'urlset' | 'index'; xml: string } {
    if (SeoRenderService.needsSitemapIndex(entries.length)) {
      const chunks = SeoRenderService.chunkSitemap(entries);
      if (opts?.page !== undefined) {
        return { kind: 'urlset', xml: SeoRenderService.sitemapXml(chunks[opts.page] ?? []) };
      }
      const base = (opts?.baseUrl ?? '').replace(/\/$/, '');
      const sitemaps = chunks.map((_, i) => ({ loc: `${base}/sitemap-${i}.xml` }));
      return { kind: 'index', xml: SeoRenderService.sitemapIndexXml(sitemaps) };
    }
    return { kind: 'urlset', xml: SeoRenderService.sitemapXml(entries) };
  }

  /** Render the full per-locale `<head>` SEO block for a stored entity. */
  static async renderHead(
    tenantId: string,
    entityType: string,
    entityId: string,
    opts?: { locale?: string; ogLocale?: string },
  ): Promise<string | null> {
    const meta = await this.get(tenantId, entityType, entityId);
    if (!meta) return null;
    const s = await SettingService.getByKeys(tenantId, ['siteName', 'googleSearchConsoleId'])
      .catch(() => ({} as Record<string, string>));
    return SeoRenderService.headTags(meta, {
      locale: opts?.locale, ogLocale: opts?.ogLocale,
      siteName: s.siteName, gscTokens: s.googleSearchConsoleId,
    });
  }
}
