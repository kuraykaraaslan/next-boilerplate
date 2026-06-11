import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import Logger from '@/modules/logger'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { DynamicCollection as DynamicCollectionEntity } from './entities/dynamic_collection.entity'
import { DynamicCollectionItem as DynamicCollectionItemEntity } from './entities/dynamic_collection_item.entity'
import {
  DynamicCollectionItemRecordSchema,
  type DynamicCollectionItemRecord,
  type ListCollectionItemsQuery,
} from './dynamic_page.types'
import type { CreateCollectionItemDTO, UpdateCollectionItemDTO } from './dynamic_page.dto'
import DynamicPageMessages from './dynamic_page.messages'
import DynamicCollectionCrudService from './dynamic_collection.crud.service'

export default class DynamicCollectionItemService {

  static async listItems(
    tenantId: string, collectionId: string, query: ListCollectionItemsQuery,
  ): Promise<{ items: DynamicCollectionItemRecord[]; total: number; page: number; pageSize: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const col = await ds.getRepository(DynamicCollectionEntity).findOne({ where: { tenantId, collectionId } })
    if (!col) throw new AppError(DynamicPageMessages.COLLECTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const qb = ds.getRepository(DynamicCollectionItemEntity)
      .createQueryBuilder('i')
      .where('i.collectionId = :collectionId AND i.tenantId = :tenantId', { collectionId, tenantId })
    if (query.sort) {
      const desc = query.sort.startsWith('-')
      const field = desc ? query.sort.slice(1) : query.sort
      const colName = field === 'createdAt' ? 'i.createdAt' : field === 'updatedAt' ? 'i.updatedAt' : 'i.createdAt'
      qb.orderBy(colName, desc ? 'DESC' : 'ASC')
    } else {
      qb.orderBy('i.createdAt', 'DESC')
    }
    qb.skip(query.page * query.pageSize).take(query.pageSize)
    const [rows, total] = await qb.getManyAndCount()
    return { items: rows.map((r) => DynamicCollectionItemRecordSchema.parse(r)), total, page: query.page, pageSize: query.pageSize }
  }

  static async getItem(tenantId: string, collectionId: string, itemId: string): Promise<DynamicCollectionItemRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(DynamicCollectionItemEntity).findOne({ where: { tenantId, collectionId, itemId } })
    if (!row) throw new AppError(DynamicPageMessages.COLLECTION_ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return DynamicCollectionItemRecordSchema.parse(row)
  }

  static async createItem(tenantId: string, collectionId: string, dto: CreateCollectionItemDTO): Promise<DynamicCollectionItemRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const col = await ds.getRepository(DynamicCollectionEntity).findOne({ where: { tenantId, collectionId } })
    if (!col) throw new AppError(DynamicPageMessages.COLLECTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    try {
      const repo = ds.getRepository(DynamicCollectionItemEntity)
      return DynamicCollectionItemRecordSchema.parse(await repo.save(repo.create({ tenantId, collectionId, data: dto.data })))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${DynamicPageMessages.COLLECTION_ITEM_CREATE_FAILED}: ${error}`)
      throw new AppError(DynamicPageMessages.COLLECTION_ITEM_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async updateItem(tenantId: string, collectionId: string, itemId: string, dto: UpdateCollectionItemDTO): Promise<DynamicCollectionItemRecord> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicCollectionItemEntity)
    const row = await repo.findOne({ where: { tenantId, collectionId, itemId } })
    if (!row) throw new AppError(DynamicPageMessages.COLLECTION_ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (dto.data !== undefined) row.data = dto.data as object
    try {
      return DynamicCollectionItemRecordSchema.parse(await repo.save(row))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${DynamicPageMessages.COLLECTION_ITEM_UPDATE_FAILED}: ${error}`)
      throw new AppError(DynamicPageMessages.COLLECTION_ITEM_UPDATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async deleteItem(tenantId: string, collectionId: string, itemId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(DynamicCollectionItemEntity)
    const row = await repo.findOne({ where: { tenantId, collectionId, itemId } })
    if (!row) throw new AppError(DynamicPageMessages.COLLECTION_ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
  }

  static makeDbHelper(tenantId: string, allowedSlugs: string[]) {
    const allowed = new Set(allowedSlugs)
    const guard = (slug: string) => {
      if (!allowed.has(slug)) throw new AppError(DynamicPageMessages.BLOCK_HANDLER_FORBIDDEN, 403, ErrorCode.FORBIDDEN)
    }
    return {
      collection: (slug: string) => {
        guard(slug)
        return {
          find: async (opts: { limit?: number; page?: number; sort?: string; filter?: Record<string, string> } = {}) => {
            const q: ListCollectionItemsQuery = { page: opts.page ?? 0, pageSize: opts.limit ?? 20, sort: opts.sort, filter: opts.filter }
            const col = await DynamicCollectionCrudService.getCollectionBySlug(tenantId, slug)
            return DynamicCollectionItemService.listItems(tenantId, col.collectionId, q)
          },
          create: async (data: Record<string, unknown>) => {
            const col = await DynamicCollectionCrudService.getCollectionBySlug(tenantId, slug)
            return DynamicCollectionItemService.createItem(tenantId, col.collectionId, { data })
          },
          update: async (itemId: string, data: Record<string, unknown>) => {
            const col = await DynamicCollectionCrudService.getCollectionBySlug(tenantId, slug)
            return DynamicCollectionItemService.updateItem(tenantId, col.collectionId, itemId, { data })
          },
          delete: async (itemId: string) => {
            const col = await DynamicCollectionCrudService.getCollectionBySlug(tenantId, slug)
            return DynamicCollectionItemService.deleteItem(tenantId, col.collectionId, itemId)
          },
        }
      },
    }
  }
}
