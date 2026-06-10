import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight } from '@/modules/redis'
import Logger from '@/modules/logger'
import { StoreCategory as CategoryEntity } from './entities/store_category.entity'
import { StoreCategorySpec as SpecEntity } from './entities/store_category_spec.entity'
import { StoreProduct as ProductEntity } from './entities/store_product.entity'
import {
  StoreCategorySchema, StoreCategorySpecSchema, StoreCategoryWithSpecsSchema,
  type StoreCategory, type StoreCategorySpec, type StoreCategoryWithSpecs,
} from './store.types'
import type {
  CreateCategoryDTO, UpdateCategoryDTO, GetCategoriesQuery, CreateSpecDTO,
} from './store.dto'
import { STORE_MESSAGES } from './store.messages'
import { AppError, ErrorCode } from '@/modules/common/app-error'

/** Store category + category-spec CRUD (split out of `StoreService`). */
export default class StoreCategoryService {
  // ============================================================================
  // Categories
  // ============================================================================

  static async createCategory(tenantId: string, data: CreateCategoryDTO): Promise<StoreCategory> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(CategoryEntity)
    const existing = await repo.findOne({ where: { tenantId, slug: data.slug } })
    if (existing) throw new AppError(STORE_MESSAGES.CATEGORY_SLUG_TAKEN, 409, ErrorCode.CONFLICT)
    try {
      const category = repo.create({ tenantId, ...data })
      const saved = await repo.save(category)
      await redis.del(`store:cats:${tenantId}`).catch(() => {})
      return StoreCategorySchema.parse(saved)
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${STORE_MESSAGES.CATEGORY_CREATE_FAILED}: ${error}`)
      throw new AppError(STORE_MESSAGES.CATEGORY_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async updateCategory(tenantId: string, categoryId: string, data: UpdateCategoryDTO): Promise<StoreCategory> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(CategoryEntity)
    const category = await repo.findOne({ where: { tenantId, categoryId } })
    if (!category) throw new AppError(STORE_MESSAGES.CATEGORY_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (data.slug && data.slug !== category.slug) {
      const taken = await repo.findOne({ where: { tenantId, slug: data.slug } })
      if (taken) throw new AppError(STORE_MESSAGES.CATEGORY_SLUG_TAKEN, 409, ErrorCode.CONFLICT)
    }
    Object.assign(category, data)
    const saved = await repo.save(category)
    await redis.del(`store:cats:${tenantId}`).catch(() => {})
    await redis.del(`store:cat:${categoryId}`).catch(() => {})
    return StoreCategorySchema.parse(saved)
  }

  static async getCategory(tenantId: string, categoryId: string, withSpecs = false): Promise<StoreCategory | StoreCategoryWithSpecs> {
    return singleFlight(`store:cat:${categoryId}:${withSpecs}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const cat = await ds.getRepository(CategoryEntity).findOne({ where: { tenantId, categoryId } })
      if (!cat) throw new AppError(STORE_MESSAGES.CATEGORY_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
      if (!withSpecs) return StoreCategorySchema.parse(cat)
      const specs = await ds.getRepository(SpecEntity).find({
        where: { tenantId, categoryId }, order: { sortOrder: 'ASC' },
      })
      return StoreCategoryWithSpecsSchema.parse({ ...cat, specs, children: [] })
    })
  }

  static async listCategories(
    tenantId: string, query: GetCategoriesQuery,
  ): Promise<{ data: Array<StoreCategory | StoreCategoryWithSpecs>; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.parentId !== undefined) where['parentId'] = query.parentId
    if (query.isActive !== undefined) where['isActive'] = query.isActive
    const [rows, total] = await ds.getRepository(CategoryEntity).findAndCount({
      where, order: { sortOrder: 'ASC', name: 'ASC' },
      skip: query.page * query.pageSize, take: query.pageSize,
    })
    if (!query.withSpecs) return { data: rows.map((r) => StoreCategorySchema.parse(r)), total }
    const specRepo = ds.getRepository(SpecEntity)
    const catIds = rows.map((r) => r.categoryId)
    const allSpecs = catIds.length
      ? await specRepo.find({ where: catIds.map((id) => ({ tenantId, categoryId: id })) })
      : []
    const specMap = new Map<string, StoreCategorySpec[]>()
    for (const s of allSpecs) {
      const arr = specMap.get(s.categoryId) ?? []
      arr.push(StoreCategorySpecSchema.parse(s))
      specMap.set(s.categoryId, arr)
    }
    return {
      data: rows.map((r) => StoreCategoryWithSpecsSchema.parse({
        ...r, specs: specMap.get(r.categoryId) ?? [], children: [],
      })),
      total,
    }
  }

  static async deleteCategory(tenantId: string, categoryId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const productCount = await ds.getRepository(ProductEntity).count({ where: { tenantId, categoryId } })
    if (productCount > 0) throw new AppError(STORE_MESSAGES.CATEGORY_HAS_PRODUCTS, 409, ErrorCode.CONFLICT)
    await ds.getRepository(CategoryEntity).softDelete({ tenantId, categoryId })
    await redis.del(`store:cats:${tenantId}`).catch(() => {})
    await redis.del(`store:cat:${categoryId}:true`).catch(() => {})
    await redis.del(`store:cat:${categoryId}:false`).catch(() => {})
  }

  // ============================================================================
  // Category Specs
  // ============================================================================

  static async upsertSpec(tenantId: string, categoryId: string, data: CreateSpecDTO): Promise<StoreCategorySpec> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SpecEntity)
    let spec = await repo.findOne({ where: { tenantId, categoryId, key: data.key } })
    if (spec) {
      Object.assign(spec, data)
    } else {
      spec = repo.create({ tenantId, categoryId, ...data })
    }
    const saved = await repo.save(spec)
    await redis.del(`store:cat:${categoryId}:true`).catch(() => {})
    return StoreCategorySpecSchema.parse(saved)
  }

  static async deleteSpec(tenantId: string, categoryId: string, specId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    await ds.getRepository(SpecEntity).delete({ tenantId, categoryId, specId })
    await redis.del(`store:cat:${categoryId}:true`).catch(() => {})
  }
}
