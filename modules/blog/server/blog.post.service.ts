import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@nb/db'
import redis, { jitter, singleFlight } from '@nb/redis'
import { env } from '@nb/env'
import Logger from '@nb/logger'
import { BlogPost as PostEntity } from './entities/blog_post.entity'
import { SafeBlogPostSchema, type SafeBlogPost } from './blog.types'
import type { CreatePostDTO, UpdatePostDTO, GetPostsQuery } from './blog.dto'
import { BLOG_MESSAGES } from './blog.messages'
import { AppError, ErrorCode } from '@nb/common/server/app-error'

// Published posts are read-heavy and change rarely → read-through cache the
// single-post detail path. List/search results are paginated and filter-heavy
// (poor cache keys), so only by-id reads are cached. The `views` counter lags by
// at most one TTL window (display-only, intentionally not invalidated per view).
const POST_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5)

function postCacheKey(tenantId: string, postId: string): string {
  return `blog:post:${tenantId}:${postId}`
}

/** Tenant-scoped blog post CRUD + publishing lifecycle. */
export default class BlogPostService {
  static async create(tenantId: string, data: CreatePostDTO): Promise<SafeBlogPost> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PostEntity)
    const existing = await repo.findOne({ where: { tenantId, slug: data.slug } })
    if (existing) throw new AppError(BLOG_MESSAGES.POST_SLUG_TAKEN, 409, ErrorCode.CONFLICT)
    try {
      const saved = await repo.save(repo.create({
        tenantId,
        ...data,
        views: 0,
        // Stamp publishedAt when a post is created already published.
        publishedAt: data.status === 'PUBLISHED' ? new Date() : undefined,
      }))
      return SafeBlogPostSchema.parse(saved)
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[BlogPostService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(BLOG_MESSAGES.POST_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async getById(tenantId: string, postId: string): Promise<SafeBlogPost> {
    const key = postCacheKey(tenantId, postId)
    const cached = await redis.get(key).catch(() => null)
    if (cached) {
      try { return SafeBlogPostSchema.parse(JSON.parse(cached)) } catch { await redis.del(key).catch(() => {}) }
    }
    return singleFlight(key, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const row = await ds.getRepository(PostEntity).findOne({ where: { tenantId, postId } })
      if (!row) throw new AppError(BLOG_MESSAGES.POST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
      const parsed = SafeBlogPostSchema.parse(row)
      await redis.setex(key, jitter(POST_CACHE_TTL), JSON.stringify(parsed)).catch(() => {})
      return parsed
    })
  }

  /** Evict the cached post (called after any write to it). */
  private static async invalidate(tenantId: string, postId: string): Promise<void> {
    await redis.del(postCacheKey(tenantId, postId)).catch(() => {})
  }

  static async list(tenantId: string, query: GetPostsQuery): Promise<{ data: SafeBlogPost[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.status) where['status'] = query.status
    if (query.categoryId) where['categoryId'] = query.categoryId
    if (query.authorId) where['authorId'] = query.authorId
    if (query.search) where['title'] = ILike(`%${query.search}%`)

    const order: Record<string, 'ASC' | 'DESC'> =
      query.sort === 'popular' ? { views: 'DESC' } : { createdAt: 'DESC' }

    const [rows, total] = await ds.getRepository(PostEntity).findAndCount({
      where,
      order,
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data: rows.map((r) => SafeBlogPostSchema.parse(r)), total }
  }

  static async update(tenantId: string, postId: string, data: UpdatePostDTO): Promise<SafeBlogPost> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PostEntity)
    const row = await repo.findOne({ where: { tenantId, postId } })
    if (!row) throw new AppError(BLOG_MESSAGES.POST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (data.slug && data.slug !== row.slug) {
      const taken = await repo.findOne({ where: { tenantId, slug: data.slug } })
      if (taken) throw new AppError(BLOG_MESSAGES.POST_SLUG_TAKEN, 409, ErrorCode.CONFLICT)
    }
    // Transition into PUBLISHED stamps publishedAt the first time.
    if (data.status === 'PUBLISHED' && row.status !== 'PUBLISHED' && !row.publishedAt) {
      row.publishedAt = new Date()
    }
    Object.assign(row, data)
    const saved = await repo.save(row)
    await this.invalidate(tenantId, postId)
    return SafeBlogPostSchema.parse(saved)
  }

  static async publish(tenantId: string, postId: string): Promise<SafeBlogPost> {
    return this.update(tenantId, postId, { status: 'PUBLISHED' })
  }

  static async unpublish(tenantId: string, postId: string): Promise<SafeBlogPost> {
    return this.update(tenantId, postId, { status: 'DRAFT' })
  }

  static async incrementViews(tenantId: string, postId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    await ds.getRepository(PostEntity).increment({ tenantId, postId }, 'views', 1)
  }

  static async delete(tenantId: string, postId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PostEntity)
    const row = await repo.findOne({ where: { tenantId, postId } })
    if (!row) throw new AppError(BLOG_MESSAGES.POST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
    await this.invalidate(tenantId, postId)
  }
}
