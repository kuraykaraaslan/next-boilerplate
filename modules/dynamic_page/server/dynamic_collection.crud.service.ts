import 'reflect-metadata'
import { tenantDataSourceFor } from '@nb/db'
import Logger from '@nb/logger'
import { AppError, ErrorCode } from '@nb/common/server/app-error'
import { DynamicCollection as DynamicCollectionEntity } from './entities/dynamic_collection.entity'
import {
  DynamicCollectionRecordSchema,
  type DynamicCollectionRecord,
  type ListCollectionsQuery,
} from './dynamic_page.types'
import type { CreateCollectionDTO, UpdateCollectionDTO } from './dynamic_page.dto'
import DynamicPageMessages from './dynamic_page.messages'

export default class DynamicCollectionCrudService {

  static async listCollections(
    tenantId: string, query: ListCollectionsQuery,
  ): Promise<{ items: DynamicCollectionRecord[]; total: number; page: number; pageSize: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const qb = ds.getRepository(DynamicCollectionEntity)
      .createQueryBuilder('c').where('c.tenantId = :tenantId', { tenantId })
    if (query.search) qb.andWhere('(c.label ILIKE :s OR c.slug ILIKE :s)', { s: `%${query.search}%` })
    qb.orderBy('c.label', 'ASC').skip(query.page * query.pageSize).take(query.pageSize)
    const [rows, total] = await qb.getManyAndCount()
    return { items: rows.map((r) => DynamicCollectionRecordSchema.parse(r)), total, page: query.page, pageSize: query.pageSize }
  }

  static async getCollection(tenantId: string, collectionId: string): Promise<DynamicCollectionRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(DynamicCollectionEntity).findOne({ where: { tenantId, collectionId } })
    if (!row) throw new AppError(DynamicPageMessages.COLLECTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return DynamicCollectionRecordSchema.parse(row)
  }

  static async getCollectionBySlug(tenantId: string, slug: string): Promise<DynamicCollectionRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(DynamicCollectionEntity).findOne({ where: { tenantId, slug } })
    if (!row) throw new AppError(DynamicPageMessages.COLLECTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return DynamicCollectionRecordSchema.parse(row)
  }

  static async createCollection(tenantId: string, dto: CreateCollectionDTO): Promise<DynamicCollectionRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicCollectionEntity)
    const existing = await repo.findOne({ where: { tenantId, slug: dto.slug } })
    if (existing) throw new AppError(DynamicPageMessages.COLLECTION_SLUG_TAKEN, 409, ErrorCode.CONFLICT)
    try {
      return DynamicCollectionRecordSchema.parse(await repo.save(repo.create({ tenantId, ...dto })))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${DynamicPageMessages.COLLECTION_CREATE_FAILED}: ${error}`)
      throw new AppError(DynamicPageMessages.COLLECTION_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async updateCollection(tenantId: string, collectionId: string, dto: UpdateCollectionDTO): Promise<DynamicCollectionRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicCollectionEntity)
    const row = await repo.findOne({ where: { tenantId, collectionId } })
    if (!row) throw new AppError(DynamicPageMessages.COLLECTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (dto.slug && dto.slug !== row.slug) {
      const conflict = await repo.findOne({ where: { tenantId, slug: dto.slug } })
      if (conflict) throw new AppError(DynamicPageMessages.COLLECTION_SLUG_TAKEN, 409, ErrorCode.CONFLICT)
    }
    if (dto.slug !== undefined) row.slug = dto.slug
    if (dto.label !== undefined) row.label = dto.label
    if (dto.description !== undefined) row.description = dto.description
    if (dto.fields !== undefined) row.fields = dto.fields as object[]
    if (dto.isSystem !== undefined) row.isSystem = dto.isSystem
    try {
      return DynamicCollectionRecordSchema.parse(await repo.save(row))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${DynamicPageMessages.COLLECTION_UPDATE_FAILED}: ${error}`)
      throw new AppError(DynamicPageMessages.COLLECTION_UPDATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async deleteCollection(tenantId: string, collectionId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicCollectionEntity)
    const row = await repo.findOne({ where: { tenantId, collectionId } })
    if (!row) throw new AppError(DynamicPageMessages.COLLECTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (row.isSystem) throw new AppError(DynamicPageMessages.COLLECTION_SYSTEM_PROTECTED, 403, ErrorCode.FORBIDDEN)
    await repo.remove(row)
  }
}
