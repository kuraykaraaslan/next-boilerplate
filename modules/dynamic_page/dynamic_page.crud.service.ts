import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight, jitter } from '@/modules/redis'
import Logger from '@/modules/logger'
import { SeoService } from '@nb/seo/server'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { DynamicPage as DynamicPageEntity } from './entities/dynamic_page.entity'
import { DynamicPageTranslation as DynamicPageTranslationEntity } from './entities/dynamic_page_translation.entity'
import {
  DynamicPageRecordSchema,
  DynamicPageTranslationRecordSchema,
  type DynamicPageRecord,
  type DynamicPageTranslationRecord,
  type ListPagesQuery,
  CURRENT_SCHEMA_VERSION,
} from './dynamic_page.types'
import type { CreatePageDTO, UpdatePageDTO, UpsertTranslationDTO } from './dynamic_page.dto'
import DynamicPageMessages from './dynamic_page.messages'

const SLUG_TTL = 3600

const slugKey = (tenantId: string, slug: string) => `dp:slug:${tenantId}:${slug}`

export default class DynamicPageCrudService {

  static async listPages(
    tenantId: string,
    query: ListPagesQuery,
  ): Promise<{ items: DynamicPageRecord[]; total: number; page: number; pageSize: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const qb = ds.getRepository(DynamicPageEntity)
      .createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })

    if (query.search) {
      qb.andWhere('(p.title ILIKE :s OR p.slug ILIKE :s)', { s: `%${query.search}%` })
    }
    if (query.status) {
      qb.andWhere('p.status = :status', { status: query.status })
    }

    const col: Record<string, string> = {
      title: 'p.title', slug: 'p.slug', status: 'p.status',
      createdAt: 'p.createdAt', updatedAt: 'p.updatedAt',
    }
    qb.orderBy(col[query.sortBy] ?? 'p.updatedAt', query.sortDir === 'asc' ? 'ASC' : 'DESC')
      .skip(query.page * query.pageSize)
      .take(query.pageSize)

    const [rows, total] = await qb.getManyAndCount()
    return {
      items: rows.map((r) => DynamicPageRecordSchema.parse(r)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  static async getPage(tenantId: string, pageId: string): Promise<DynamicPageRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(DynamicPageEntity).findOne({
      where: { tenantId, dynamicPageId: pageId },
    })
    if (!row) throw new AppError(DynamicPageMessages.PAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return DynamicPageRecordSchema.parse(row)
  }

  static async getPageBySlug(tenantId: string, slug: string): Promise<DynamicPageRecord> {
    const key = slugKey(tenantId, slug)
    return singleFlight(key, async () => {
      const cached = await redis.get(key).catch(() => null)
      if (cached) {
        try { return JSON.parse(cached) as DynamicPageRecord } catch { await redis.del(key).catch(() => {}) }
      }

      const ds = await tenantDataSourceFor(tenantId)
      const row = await ds.getRepository(DynamicPageEntity).findOne({
        where: { tenantId, slug },
      })
      if (!row) throw new AppError(DynamicPageMessages.PAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
      const parsed = DynamicPageRecordSchema.parse(row)
      await redis.setex(key, jitter(SLUG_TTL), JSON.stringify(parsed)).catch(() => {})
      return parsed
    })
  }

  static async createPage(tenantId: string, dto: CreatePageDTO): Promise<DynamicPageRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicPageEntity)

    const existing = await repo.findOne({ where: { tenantId, slug: dto.slug } })
    if (existing) throw new AppError(DynamicPageMessages.SLUG_TAKEN, 409, ErrorCode.CONFLICT)

    try {
      const { metadata, ...rest } = dto
      const page = repo.create({ tenantId, ...rest, metadata: metadata ?? undefined, schemaVersion: CURRENT_SCHEMA_VERSION })
      const saved = await repo.save(page) as DynamicPageEntity
      return DynamicPageRecordSchema.parse(saved)
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${DynamicPageMessages.PAGE_CREATE_FAILED}: ${error}`)
      throw new AppError(DynamicPageMessages.PAGE_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async updatePage(tenantId: string, pageId: string, dto: UpdatePageDTO): Promise<DynamicPageRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicPageEntity)

    const row = await repo.findOne({ where: { tenantId, dynamicPageId: pageId } })
    if (!row) throw new AppError(DynamicPageMessages.PAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    const oldSlug = row.slug
    if (dto.slug && dto.slug !== oldSlug) {
      const conflict = await repo.findOne({ where: { tenantId, slug: dto.slug } })
      if (conflict) throw new AppError(DynamicPageMessages.SLUG_TAKEN, 409, ErrorCode.CONFLICT)
    }

    // Snapshot the pre-update content into version history (best-effort).
    try {
      const { DynamicPageVersion } = await import('./entities/dynamic_page_version.entity')
      await ds.getRepository(DynamicPageVersion).save({
        tenantId, dynamicPageId: pageId, revision: row.revision ?? 1,
        title: row.title, description: row.description, sections: row.sections,
        metadata: row.metadata, status: row.status,
      })
    } catch { /* version history is best-effort */ }

    if (dto.title !== undefined) row.title = dto.title
    if (dto.slug !== undefined) row.slug = dto.slug
    if (dto.description !== undefined) row.description = dto.description
    if (dto.keywords !== undefined) row.keywords = dto.keywords
    if (dto.sections !== undefined) row.sections = dto.sections
    if (dto.metadata !== undefined) row.metadata = dto.metadata ?? undefined
    if (dto.status !== undefined) row.status = dto.status
    if (dto.publishAt !== undefined) row.publishAt = dto.publishAt
    if (dto.expireAt !== undefined) row.expireAt = dto.expireAt
    if (dto.cacheTtlSeconds !== undefined) row.cacheTtlSeconds = dto.cacheTtlSeconds
    if (dto.audienceCountries !== undefined) row.audienceCountries = dto.audienceCountries
    if (dto.audienceLanguages !== undefined) row.audienceLanguages = dto.audienceLanguages
    if (dto.audienceRoles !== undefined) row.audienceRoles = dto.audienceRoles
    if (dto.schemaVersion !== undefined) row.schemaVersion = dto.schemaVersion
    row.revision = (row.revision ?? 1) + 1

    try {
      const saved = await repo.save(row)
      await redis.del(slugKey(tenantId, saved.slug)).catch(() => {})
      if (oldSlug !== saved.slug) await redis.del(slugKey(tenantId, oldSlug)).catch(() => {})
      // CDN-friendly cache invalidation webhook so edges can purge this page.
      try {
        const { default: WebhookService } = await import('@/modules/webhook/webhook.service')
        await WebhookService.dispatchEvent(tenantId, 'page.invalidated', { dynamicPageId: pageId, slug: saved.slug })
        if (dto.status === 'PUBLISHED') await WebhookService.dispatchEvent(tenantId, 'page.published', { dynamicPageId: pageId, slug: saved.slug })
      } catch { /* webhook best-effort */ }
      return DynamicPageRecordSchema.parse(saved)
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${DynamicPageMessages.PAGE_UPDATE_FAILED}: ${error}`)
      throw new AppError(DynamicPageMessages.PAGE_UPDATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async deletePage(tenantId: string, pageId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicPageEntity)
    const row = await repo.findOne({ where: { tenantId, dynamicPageId: pageId } })
    if (!row) throw new AppError(DynamicPageMessages.PAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
    await redis.del(slugKey(tenantId, row.slug)).catch(() => {})
    SeoService.delete(tenantId, 'dynamic_page', pageId).catch((err) =>
      Logger.warn(`[DynamicPage] SEO cleanup failed for page ${pageId}: ${err}`)
    )
  }

  static async getTranslations(tenantId: string, pageId: string): Promise<DynamicPageTranslationRecord[]> {
    const ds = await tenantDataSourceFor(tenantId)
    const rows = await ds.getRepository(DynamicPageTranslationEntity).find({
      where: { tenantId, dynamicPageId: pageId },
      order: { lang: 'ASC' },
    })
    return rows.map((r) => DynamicPageTranslationRecordSchema.parse(r))
  }

  static async upsertTranslation(
    tenantId: string,
    pageId: string,
    dto: UpsertTranslationDTO,
  ): Promise<DynamicPageTranslationRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicPageTranslationEntity)

    let row = await repo.findOne({ where: { tenantId, dynamicPageId: pageId, lang: dto.lang } })
    if (row) {
      Object.assign(row, { title: dto.title, description: dto.description, sections: dto.sections })
    } else {
      row = repo.create({ tenantId, dynamicPageId: pageId, ...dto })
    }
    try {
      const saved = await repo.save(row)
      return DynamicPageTranslationRecordSchema.parse(saved)
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${DynamicPageMessages.TRANSLATION_UPSERT_FAILED}: ${error}`)
      throw new AppError(DynamicPageMessages.TRANSLATION_UPSERT_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async deleteTranslation(tenantId: string, pageId: string, lang: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicPageTranslationEntity)
    const row = await repo.findOne({ where: { tenantId, dynamicPageId: pageId, lang } })
    if (!row) throw new AppError(DynamicPageMessages.TRANSLATION_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
  }
}
