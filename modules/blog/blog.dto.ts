import { z } from 'zod'
import { PostStatusEnum, CommentStatusEnum } from './blog.enums'

// ============================================================================
// Category DTOs
// ============================================================================

export const CreateCategoryDTO = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
  keywords: z.array(z.string()).optional(),
})
export type CreateCategoryDTO = z.infer<typeof CreateCategoryDTO>

export const UpdateCategoryDTO = CreateCategoryDTO.partial()
export type UpdateCategoryDTO = z.infer<typeof UpdateCategoryDTO>

export const GetCategoriesQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetCategoriesQuery = z.infer<typeof GetCategoriesQuery>

// ============================================================================
// Post DTOs
// ============================================================================

export const CreatePostDTO = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string().min(1),
  description: z.string().optional(),
  authorId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  image: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  status: PostStatusEnum.default('DRAFT'),
})
export type CreatePostDTO = z.infer<typeof CreatePostDTO>

export const UpdatePostDTO = CreatePostDTO.partial()
export type UpdatePostDTO = z.infer<typeof UpdatePostDTO>

export const GetPostsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  status: PostStatusEnum.optional(),
  categoryId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
  search: z.string().optional(),
  sort: z.enum(['recent', 'popular']).default('recent'),
})
export type GetPostsQuery = z.infer<typeof GetPostsQuery>

// ============================================================================
// Comment DTOs
// ============================================================================

export const CreateCommentDTO = z.object({
  content: z.string().min(1),
  parentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
})
export type CreateCommentDTO = z.infer<typeof CreateCommentDTO>

export const ModerateCommentDTO = z.object({
  status: CommentStatusEnum,
})
export type ModerateCommentDTO = z.infer<typeof ModerateCommentDTO>

export const GetCommentsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  status: CommentStatusEnum.optional(),
})
export type GetCommentsQuery = z.infer<typeof GetCommentsQuery>
