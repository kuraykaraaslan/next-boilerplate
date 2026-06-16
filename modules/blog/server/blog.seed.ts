import 'reflect-metadata'
import type { FindOptionsWhere } from 'typeorm'
import type { SeedContext } from '@nb/seed/server/seed.context'
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@nb/seed/server/seed.context'
import { BlogCategory } from './entities/blog_category.entity'
import { BlogPost } from './entities/blog_post.entity'
import { BlogComment } from './entities/blog_comment.entity'

/**
 * Demo seed for the `blog` module. Idempotent via `ctx.foc(repo, where, create)`
 * using natural keys: category/post by (tenantId, slug), comment by
 * (tenantId, postId, content). All three entities carry `tenantId` → tenant-scoped.
 */
export async function seedBlog(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx
  const authorId = (refs.userId as string) ?? SEED_USER_ID
  const adminId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID
  const now = Date.now()
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000)

  // ── Categories ─────────────────────────────────────────────────────────────
  const catRepo = ctx.repo<BlogCategory>(BlogCategory)
  const announcements = await foc(catRepo,
    { tenantId, slug: 'announcements' } as FindOptionsWhere<BlogCategory>,
    { tenantId, title: 'Announcements', slug: 'announcements', description: 'Product news and updates', keywords: ['news', 'updates'] },
  )
  const guides = await foc(catRepo,
    { tenantId, slug: 'guides' } as FindOptionsWhere<BlogCategory>,
    { tenantId, title: 'Guides', slug: 'guides', description: 'How-to articles', keywords: ['guide', 'howto'] },
  )

  // ── Posts (one PUBLISHED, one DRAFT) ───────────────────────────────────────
  const postRepo = ctx.repo<BlogPost>(BlogPost)
  const published = await foc(postRepo,
    { tenantId, slug: 'hello-world' } as FindOptionsWhere<BlogPost>,
    {
      tenantId,
      title: 'Hello World',
      slug: 'hello-world',
      content: 'Welcome to the blog. This is our very first published post.',
      description: 'Our first post',
      authorId,
      categoryId: announcements.categoryId,
      keywords: ['welcome', 'first'],
      status: 'PUBLISHED',
      views: 42,
      publishedAt: daysAgo(7),
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    },
  )
  await foc(postRepo,
    { tenantId, slug: 'upcoming-features' } as FindOptionsWhere<BlogPost>,
    {
      tenantId,
      title: 'Upcoming Features (Draft)',
      slug: 'upcoming-features',
      content: 'A sneak peek at what we are working on. Still being written.',
      authorId: adminId,
      categoryId: guides.categoryId,
      keywords: ['roadmap'],
      status: 'DRAFT',
      views: 0,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  )

  // ── Comment on the published post ──────────────────────────────────────────
  const commentRepo = ctx.repo<BlogComment>(BlogComment)
  await foc(commentRepo,
    { tenantId, postId: published.postId, content: 'Great first post!' } as FindOptionsWhere<BlogComment>,
    {
      tenantId,
      postId: published.postId,
      content: 'Great first post!',
      name: 'Guest Reader',
      email: 'guest@example.com',
      status: 'PUBLISHED',
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    },
  )

  refs.blogPostId = published.postId
  ctx.log(`blog: 2 categories, 2 posts, 1 comment for ${tenantId}`)
}
