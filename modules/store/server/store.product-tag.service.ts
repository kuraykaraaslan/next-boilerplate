import 'reflect-metadata'
import { ILike, Not } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { StoreProductTag } from './entities/store_product_tag.entity'
import type { CreateProductTagDTO, UpdateProductTagDTO, GetProductTagsQuery } from './store.dto'
import { STORE_MESSAGES } from './store.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped product-tag (configurable master-data) CRUD. */
export default class StoreProductTagService {
  static async list(tenantId: string, query: GetProductTagsQuery): Promise<{ data: StoreProductTag[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(StoreProductTag)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [data, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, tagId: string): Promise<StoreProductTag> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(StoreProductTag).findOne({ where: { tenantId, tagId } })
    if (!row) throw new AppError(STORE_MESSAGES.PRODUCT_TAG_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  private static async assertSlugUnique(tenantId: string, slug: string, exceptTagId?: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId, slug }
    if (exceptTagId) where.tagId = Not(exceptTagId)
    const clash = await ds.getRepository(StoreProductTag).findOne({ where })
    if (clash) throw new AppError(STORE_MESSAGES.PRODUCT_TAG_SLUG_TAKEN, 409, ErrorCode.CONFLICT)
  }

  static async create(tenantId: string, data: CreateProductTagDTO): Promise<StoreProductTag> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(StoreProductTag)
    await this.assertSlugUnique(tenantId, data.slug)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[StoreProductTagService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(STORE_MESSAGES.PRODUCT_TAG_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, tagId: string, data: UpdateProductTagDTO): Promise<StoreProductTag> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(StoreProductTag)
    const row = await repo.findOne({ where: { tenantId, tagId } })
    if (!row) throw new AppError(STORE_MESSAGES.PRODUCT_TAG_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (data.slug && data.slug !== row.slug) await this.assertSlugUnique(tenantId, data.slug, tagId)
    Object.assign(row, data)
    return await repo.save(row)
  }

  static async delete(tenantId: string, tagId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(StoreProductTag)
    const row = await repo.findOne({ where: { tenantId, tagId } })
    if (!row) throw new AppError(STORE_MESSAGES.PRODUCT_TAG_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
