import { z } from 'zod'
import { PostStatusEnum, CommentStatusEnum } from './blog.enums'

// ============================================================================
// Category
// ============================================================================

export const BlogCategorySchema = z.object({
  categoryId: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  image: z.string().nullable(),
  keywords: z.array(z.string()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type BlogCategory = z.infer<typeof BlogCategorySchema>

export const SafeBlogCategorySchema = BlogCategorySchema.omit({ deletedAt: true })
export type SafeBlogCategory = z.infer<typeof SafeBlogCategorySchema>

// ============================================================================
// Post
// ============================================================================

export const BlogPostSchema = z.object({
  postId: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  description: z.string().nullable(),
  authorId: z.string().uuid().nullable(),
  categoryId: z.string().uuid().nullable(),
  image: z.string().nullable(),
  keywords: z.array(z.string()).nullable(),
  status: PostStatusEnum,
  views: z.number().int(),
  publishedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type BlogPost = z.infer<typeof BlogPostSchema>

export const SafeBlogPostSchema = BlogPostSchema.omit({ deletedAt: true })
export type SafeBlogPost = z.infer<typeof SafeBlogPostSchema>

// ============================================================================
// Comment
// ============================================================================

export const BlogCommentSchema = z.object({
  commentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  postId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  content: z.string(),
  userId: z.string().uuid().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  status: CommentStatusEnum,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type BlogComment = z.infer<typeof BlogCommentSchema>

export const SafeBlogCommentSchema = BlogCommentSchema.omit({ deletedAt: true })
export type SafeBlogComment = z.infer<typeof SafeBlogCommentSchema>
