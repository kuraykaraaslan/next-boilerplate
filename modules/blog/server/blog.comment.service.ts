import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import SettingService from '@kuraykaraaslan/setting/server/setting.service'
import { BlogComment as CommentEntity } from './entities/blog_comment.entity'
import { BlogPost as PostEntity } from './entities/blog_post.entity'
import { SafeBlogCommentSchema, type SafeBlogComment } from './blog.types'
import type { CreateCommentDTO, ModerateCommentDTO, GetCommentsQuery } from './blog.dto'
import { BLOG_MESSAGES } from './blog.messages'
import { BLOG_SETTING_DEFAULTS, type BlogTenantSettingKey } from './blog.setting.keys'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped blog comments. Creation behaviour is driven by tenant settings. */
export default class BlogCommentService {
  /** Reads a boolean tenant setting, falling back to the module default. */
  private static async boolSetting(tenantId: string, key: BlogTenantSettingKey): Promise<boolean> {
    const raw = await SettingService.getValue(tenantId, key)
    if (raw === null) return BLOG_SETTING_DEFAULTS[key]
    return raw === 'true'
  }

  static async create(tenantId: string, postId: string, data: CreateCommentDTO): Promise<SafeBlogComment> {
    const ds = await tenantDataSourceFor(tenantId)

    // The post must exist within this tenant.
    const post = await ds.getRepository(PostEntity).findOne({ where: { tenantId, postId } })
    if (!post) throw new AppError(BLOG_MESSAGES.POST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    const [allowAnonymous, moderation] = await Promise.all([
      this.boolSetting(tenantId, 'blogAllowAnonymousComments'),
      this.boolSetting(tenantId, 'blogCommentModeration'),
    ])

    if (!data.userId && !allowAnonymous) {
      throw new AppError(BLOG_MESSAGES.ANONYMOUS_COMMENTS_DISABLED, 403, ErrorCode.FORBIDDEN)
    }

    const repo = ds.getRepository(CommentEntity)
    const saved = await repo.save(repo.create({
      tenantId,
      postId,
      parentId: data.parentId,
      content: data.content,
      userId: data.userId,
      name: data.name,
      email: data.email,
      status: moderation ? 'NOT_PUBLISHED' : 'PUBLISHED',
    }))
    return SafeBlogCommentSchema.parse(saved)
  }

  static async list(tenantId: string, postId: string, query: GetCommentsQuery): Promise<{ data: SafeBlogComment[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId, postId }
    if (query.status) where['status'] = query.status
    const [rows, total] = await ds.getRepository(CommentEntity).findAndCount({
      where,
      order: { createdAt: 'ASC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data: rows.map((r) => SafeBlogCommentSchema.parse(r)), total }
  }

  static async moderate(tenantId: string, commentId: string, data: ModerateCommentDTO): Promise<SafeBlogComment> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(CommentEntity)
    const row = await repo.findOne({ where: { tenantId, commentId } })
    if (!row) throw new AppError(BLOG_MESSAGES.COMMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    row.status = data.status
    const saved = await repo.save(row)
    return SafeBlogCommentSchema.parse(saved)
  }

  static async delete(tenantId: string, commentId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(CommentEntity)
    const row = await repo.findOne({ where: { tenantId, commentId } })
    if (!row) throw new AppError(BLOG_MESSAGES.COMMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
