import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight, jitter } from '@/modules/redis'
import Logger from '@/modules/logger'
import SeoService from '@/modules/seo/seo.service'
import { DynamicPage as DynamicPageEntity } from './entities/dynamic_page.entity'
import { DynamicPageTranslation as DynamicPageTranslationEntity } from './entities/dynamic_page_translation.entity'
import { DynamicPageBlock as DynamicPageBlockEntity } from './entities/dynamic_page_block.entity'
import {
  DynamicPageRecordSchema,
  DynamicPageTranslationRecordSchema,
  DynamicPageBlockRecordSchema,
  type DynamicPageRecord,
  type DynamicPageTranslationRecord,
  type DynamicPageBlockRecord,
  type ListPagesQuery,
  CURRENT_SCHEMA_VERSION,
} from './dynamic_page.types'
import type { CreatePageDTO, UpdatePageDTO, UpsertTranslationDTO, CreateBlockDTO, UpdateBlockDTO } from './dynamic_page.dto'
import DynamicPageMessages from './dynamic_page.messages'

const SLUG_TTL = 3600
const BLOCKS_TTL = 300

const slugKey = (tenantId: string, slug: string) => `dp:slug:${tenantId}:${slug}`
const blocksKey = (tenantId: string) => `dp:blocks:${tenantId}`

export default class DynamicPageService {
  // ─── Pages ────────────────────────────────────────────────────────────────

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
    if (!row) throw new Error(DynamicPageMessages.PAGE_NOT_FOUND)
    return DynamicPageRecordSchema.parse(row)
  }

  static async getPageBySlug(tenantId: string, slug: string): Promise<DynamicPageRecord> {
    const key = slugKey(tenantId, slug)
    return singleFlight(key, async () => {
      const cached = await redis.get(key)
      if (cached) return JSON.parse(cached) as DynamicPageRecord

      const ds = await tenantDataSourceFor(tenantId)
      const row = await ds.getRepository(DynamicPageEntity).findOne({
        where: { tenantId, slug },
      })
      if (!row) throw new Error(DynamicPageMessages.PAGE_NOT_FOUND)
      const parsed = DynamicPageRecordSchema.parse(row)
      await redis.setex(key, jitter(SLUG_TTL), JSON.stringify(parsed))
      return parsed
    })
  }

  static async createPage(tenantId: string, dto: CreatePageDTO): Promise<DynamicPageRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicPageEntity)

    const existing = await repo.findOne({ where: { tenantId, slug: dto.slug } })
    if (existing) throw new Error(DynamicPageMessages.SLUG_TAKEN)

    try {
      const { metadata, ...rest } = dto
      const page = repo.create({ tenantId, ...rest, metadata: metadata ?? undefined, schemaVersion: CURRENT_SCHEMA_VERSION })
      const saved = await repo.save(page) as DynamicPageEntity
      await DynamicPageService._syncSeo(tenantId, saved.dynamicPageId, dto)
      return DynamicPageRecordSchema.parse(saved)
    } catch (error) {
      Logger.error(`${DynamicPageMessages.PAGE_CREATE_FAILED}: ${error}`)
      throw new Error(DynamicPageMessages.PAGE_CREATE_FAILED)
    }
  }

  static async updatePage(tenantId: string, pageId: string, dto: UpdatePageDTO): Promise<DynamicPageRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicPageEntity)

    const row = await repo.findOne({ where: { tenantId, dynamicPageId: pageId } })
    if (!row) throw new Error(DynamicPageMessages.PAGE_NOT_FOUND)

    const oldSlug = row.slug
    if (dto.slug && dto.slug !== oldSlug) {
      const conflict = await repo.findOne({ where: { tenantId, slug: dto.slug } })
      if (conflict) throw new Error(DynamicPageMessages.SLUG_TAKEN)
    }

    Object.assign(row, dto)
    try {
      const saved = await repo.save(row)
      await redis.del(slugKey(tenantId, saved.slug))
      if (oldSlug !== saved.slug) await redis.del(slugKey(tenantId, oldSlug))
      await DynamicPageService._syncSeo(tenantId, pageId, dto)
      return DynamicPageRecordSchema.parse(saved)
    } catch (error) {
      Logger.error(`${DynamicPageMessages.PAGE_UPDATE_FAILED}: ${error}`)
      throw new Error(DynamicPageMessages.PAGE_UPDATE_FAILED)
    }
  }

  static async deletePage(tenantId: string, pageId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicPageEntity)
    const row = await repo.findOne({ where: { tenantId, dynamicPageId: pageId } })
    if (!row) throw new Error(DynamicPageMessages.PAGE_NOT_FOUND)
    await repo.remove(row)
    await redis.del(slugKey(tenantId, row.slug))
    await SeoService.delete(tenantId, 'dynamic_page', pageId)
  }

  // ─── Translations ─────────────────────────────────────────────────────────

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
      Logger.error(`${DynamicPageMessages.TRANSLATION_UPSERT_FAILED}: ${error}`)
      throw new Error(DynamicPageMessages.TRANSLATION_UPSERT_FAILED)
    }
  }

  static async deleteTranslation(tenantId: string, pageId: string, lang: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicPageTranslationEntity)
    const row = await repo.findOne({ where: { tenantId, dynamicPageId: pageId, lang } })
    if (!row) throw new Error(DynamicPageMessages.TRANSLATION_NOT_FOUND)
    await repo.remove(row)
  }

  // ─── DB Blocks ────────────────────────────────────────────────────────────

  static async listBlocks(tenantId: string): Promise<DynamicPageBlockRecord[]> {
    const key = blocksKey(tenantId)
    return singleFlight(key, async () => {
      const cached = await redis.get(key)
      if (cached) return JSON.parse(cached) as DynamicPageBlockRecord[]

      const ds = await tenantDataSourceFor(tenantId)
      const rows = await ds.getRepository(DynamicPageBlockEntity).find({
        where: { tenantId },
        order: { category: 'ASC', label: 'ASC' },
      })
      const parsed = rows.map((r) => DynamicPageBlockRecordSchema.parse(r))
      await redis.setex(key, jitter(BLOCKS_TTL), JSON.stringify(parsed))
      return parsed
    })
  }

  static async getBlock(tenantId: string, blockId: string): Promise<DynamicPageBlockRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(DynamicPageBlockEntity).findOne({ where: { tenantId, blockId } })
    if (!row) throw new Error(DynamicPageMessages.BLOCK_NOT_FOUND)
    return DynamicPageBlockRecordSchema.parse(row)
  }

  static async createBlock(tenantId: string, dto: CreateBlockDTO): Promise<DynamicPageBlockRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicPageBlockEntity)

    const existing = await repo.findOne({ where: { tenantId, type: dto.type } })
    if (existing) throw new Error(DynamicPageMessages.BLOCK_TYPE_TAKEN)

    try {
      const block = repo.create({ tenantId, ...dto })
      const saved = await repo.save(block)
      await redis.del(blocksKey(tenantId))
      return DynamicPageBlockRecordSchema.parse(saved)
    } catch (error) {
      Logger.error(`${DynamicPageMessages.BLOCK_CREATE_FAILED}: ${error}`)
      throw new Error(DynamicPageMessages.BLOCK_CREATE_FAILED)
    }
  }

  static async updateBlock(tenantId: string, blockId: string, dto: UpdateBlockDTO): Promise<DynamicPageBlockRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicPageBlockEntity)

    const row = await repo.findOne({ where: { tenantId, blockId } })
    if (!row) throw new Error(DynamicPageMessages.BLOCK_NOT_FOUND)

    if (dto.type && dto.type !== row.type) {
      const conflict = await repo.findOne({ where: { tenantId, type: dto.type } })
      if (conflict) throw new Error(DynamicPageMessages.BLOCK_TYPE_TAKEN)
    }

    Object.assign(row, dto)
    try {
      const saved = await repo.save(row)
      await redis.del(blocksKey(tenantId))
      return DynamicPageBlockRecordSchema.parse(saved)
    } catch (error) {
      Logger.error(`${DynamicPageMessages.BLOCK_UPDATE_FAILED}: ${error}`)
      throw new Error(DynamicPageMessages.BLOCK_UPDATE_FAILED)
    }
  }

  static async deleteBlock(tenantId: string, blockId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicPageBlockEntity)
    const row = await repo.findOne({ where: { tenantId, blockId } })
    if (!row) throw new Error(DynamicPageMessages.BLOCK_NOT_FOUND)
    if (row.isSystem) throw new Error(DynamicPageMessages.SYSTEM_BLOCK_PROTECTED)
    await repo.remove(row)
    await redis.del(blocksKey(tenantId))
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private static async _syncSeo(tenantId: string, pageId: string, dto: Partial<CreatePageDTO>) {
    try {
      await SeoService.upsert(tenantId, 'dynamic_page', pageId, {
        title: dto.title,
        description: dto.description,
        keywords: dto.keywords,
        ogTitle: dto.metadata?.ogTitle,
        ogDescription: dto.metadata?.ogDescription,
        ogImageUrl: dto.metadata?.ogImage,
        canonicalUrl: dto.metadata?.canonical,
        noIndex: dto.metadata?.robots === 'noindex',
      })
    } catch (err) {
      Logger.warn(`DynamicPageService: SEO sync failed for page ${pageId}: ${err}`)
    }
  }
}
