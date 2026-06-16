import BlogPostService from './blog.post.service'
import BlogCategoryService from './blog.category.service'
import BlogCommentService from './blog.comment.service'

/**
 * Public facade for the blog module. Groups the three tenant-scoped
 * sub-services (posts, categories, comments) behind one import surface.
 *
 *   import { BlogService } from '@nb/blog'
 *   await BlogService.posts.list(tenantId, query)
 */
export default class BlogService {
  static readonly posts = BlogPostService
  static readonly categories = BlogCategoryService
  static readonly comments = BlogCommentService
}
