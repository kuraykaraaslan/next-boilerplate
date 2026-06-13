import { z } from 'zod'

export const PostStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
export type PostStatus = z.infer<typeof PostStatusEnum>

export const CommentStatusEnum = z.enum(['NOT_PUBLISHED', 'PUBLISHED', 'SPAM'])
export type CommentStatus = z.infer<typeof CommentStatusEnum>
