import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import redis, { jitter, singleFlight } from '@kuraykaraaslan/redis'
import { env } from '@kuraykaraaslan/env'
import Logger from '@kuraykaraaslan/logger'
import { BlogCategory as CategoryEntity } from './entities/blog_category.entity'
import { BlogPost as PostEntity } from './entities/blog_post.entity'
import { SafeBlogCategorySchema, type SafeBlogCategory } from './blog.types'
import type { CreateCategoryDTO, UpdateCategoryDTO, GetCategoriesQuery } from './blog.dto'
import { BLOG_MESSAGES } from './blog.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

// Categories rarely change but are read on every category page → cache by-id reads.
const CATEGORY_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5)

function categoryCacheKey(tenantId: string, categoryId: string): string {
  return `blog:category:${tenantId}:${categoryId}`
}

/** Tenant-scoped blog category CRUD. */
export default class BlogCategoryService {
  static async create(tenantId: string, data: CreateCategoryDTO): Promise<SafeBlogCategory> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(CategoryEntity)
    const existing = await repo.findOne({ where: { tenantId, slug: data.slug } })
    if (existing) throw new AppError(BLOG_MESSAGES.CATEGORY_SLUG_TAKEN, 409, ErrorCode.CONFLICT)
    try {
      const saved = await repo.save(repo.create({ tenantId, ...data }))
      return SafeBlogCategorySchema.parse(saved)
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[BlogCategoryService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(BLOG_MESSAGES.CATEGORY_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async getById(tenantId: string, categoryId: string): Promise<SafeBlogCategory> {
    const key = categoryCacheKey(tenantId, categoryId)
    const cached = await redis.get(key).catch(() => null)
    if (cached) {
      try { return SafeBlogCategorySchema.parse(JSON.parse(cached)) } catch { await redis.del(key).catch(() => {}) }
    }
    return singleFlight(key, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const row = await ds.getRepository(CategoryEntity).findOne({ where: { tenantId, categoryId } })
      if (!row) throw new AppError(BLOG_MESSAGES.CATEGORY_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
      const parsed = SafeBlogCategorySchema.parse(row)
      await redis.setex(key, jitter(CATEGORY_CACHE_TTL), JSON.stringify(parsed)).catch(() => {})
      return parsed
    })
  }

  /** Evict the cached category (called after any write to it). */
  private static async invalidate(tenantId: string, categoryId: string): Promise<void> {
    await redis.del(categoryCacheKey(tenantId, categoryId)).catch(() => {})
  }

  static async list(tenantId: string, query: GetCategoriesQuery): Promise<{ data: SafeBlogCategory[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['title'] = ILike(`%${query.search}%`)
    const [rows, total] = await ds.getRepository(CategoryEntity).findAndCount({
      where,
      order: { title: 'ASC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data: rows.map((r) => SafeBlogCategorySchema.parse(r)), total }
  }

  static async update(tenantId: string, categoryId: string, data: UpdateCategoryDTO): Promise<SafeBlogCategory> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(CategoryEntity)
    const row = await repo.findOne({ where: { tenantId, categoryId } })
    if (!row) throw new AppError(BLOG_MESSAGES.CATEGORY_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (data.slug && data.slug !== row.slug) {
      const taken = await repo.findOne({ where: { tenantId, slug: data.slug } })
      if (taken) throw new AppError(BLOG_MESSAGES.CATEGORY_SLUG_TAKEN, 409, ErrorCode.CONFLICT)
    }
    Object.assign(row, data)
    const saved = await repo.save(row)
    await this.invalidate(tenantId, categoryId)
    return SafeBlogCategorySchema.parse(saved)
  }

  static async delete(tenantId: string, categoryId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const postCount = await ds.getRepository(PostEntity).count({ where: { tenantId, categoryId } })
    if (postCount > 0) throw new AppError(BLOG_MESSAGES.CATEGORY_HAS_POSTS, 409, ErrorCode.CONFLICT)
    const repo = ds.getRepository(CategoryEntity)
    const row = await repo.findOne({ where: { tenantId, categoryId } })
    if (!row) throw new AppError(BLOG_MESSAGES.CATEGORY_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
    await this.invalidate(tenantId, categoryId)
  }
}
