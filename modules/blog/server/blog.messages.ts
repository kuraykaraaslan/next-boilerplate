export const BLOG_MESSAGES = {
  POST_NOT_FOUND: 'Post not found',
  CATEGORY_NOT_FOUND: 'Category not found',
  COMMENT_NOT_FOUND: 'Comment not found',
  POST_SLUG_TAKEN: 'A post with this slug already exists',
  CATEGORY_SLUG_TAKEN: 'A category with this slug already exists',
  CATEGORY_HAS_POSTS: 'Category cannot be deleted while it has posts',
  ANONYMOUS_COMMENTS_DISABLED: 'Anonymous comments are disabled for this blog',
  POST_CREATE_FAILED: 'Failed to create post',
  CATEGORY_CREATE_FAILED: 'Failed to create category',
} as const
