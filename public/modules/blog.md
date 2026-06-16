# Blog

- **id:** `blog`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/blog/`
- **tags:** blog, content, cms, comments, moderation
- **icon:** `fas fa-newspaper`
- **hasNextLayer:** true

Tenant-scoped blog with posts, categories and threaded comments. Posts have a draft/published/archived lifecycle; comment moderation and anonymous-comment policy are per-tenant settings.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `setting`

## Services

- `blog.category.service.ts`
- `blog.comment.service.ts`
- `blog.post.service.ts`
- `blog.service.ts`

## DTOs

- `blog.dto.ts`

## Entities

- `blog_category.entity.ts`
- `blog_comment.entity.ts`
- `blog_post.entity.ts`

## Enums

- `blog.enums.ts`

## Message keys

- `blog.messages.ts`

## Setting keys

- `blog.setting.keys.ts`

## TypeORM entities

- `BlogCategory` (system) — `modules/blog/server/entities/blog_category.entity.ts`
- `BlogComment` (system) — `modules/blog/server/entities/blog_comment.entity.ts`
- `BlogPost` (system) — `modules/blog/server/entities/blog_post.entity.ts`

## Next layer (modules_next/) surface

- `blog/ui/blog-categories.page` _(ui, client)_
- `blog/ui/blog-post-create-modal.component` _(ui, client)_
- `blog/ui/blog-posts-post-id.page` _(ui, client)_
- `blog/ui/blog-posts.page` _(ui, client)_
- `blog/ui/blog-status-badge.component` _(ui, client)_

## README

# Blog Module

Tenant-scoped blogging: posts, categories and threaded comments. Every row is
isolated by `tenantId` and every service method takes `tenantId` as its first
argument (per `multi-tenancy-patterns.md`).

## Public API

Import from the barrel `@/modules/blog`:

| Export | Type | Use |
|---|---|---|
| `BlogService` | class | Facade — `BlogService.posts` / `.categories` / `.comments` |
| `BlogPostService` | class | Post CRUD + publish/unpublish + view counts |
| `BlogCategoryService` | class | Category CRUD |
| `BlogCommentService` | class | Comment create/list/moderate (setting-driven) |
| `Create*DTO`, `Get*Query` | Zod | Input validation |
| `Safe*Schema` | Zod | Output filtering (omits `deletedAt`) |
| `BLOG_MESSAGES` | object | Error/message constants |
| `BLOG_TENANT_KEYS` | string[] | Tenant setting keys |

## Entities

- `BlogPost` (`blog_posts`) — `title`, `slug` (unique per tenant), `content`, `authorId` (a tenant member userId), `categoryId`, `status` (`DRAFT`/`PUBLISHED`/`ARCHIVED`), `views`, `publishedAt`.
- `BlogCategory` (`blog_categories`) — `title`, `slug` (unique per tenant), `keywords`.
- `BlogComment` (`blog_comments`) — `postId`, `parentId` (threads), `userId` or anonymous `name`/`email`, `status` (`NOT_PUBLISHED`/`PUBLISHED`/`SPAM`).

## Tenant settings

Read at runtime via `SettingService.getValue(tenantId, key)` (defaults in `blog.setting.keys.ts`):

- `blogAllowAnonymousComments` (default `true`) — if `false`, a comment must carry a `userId`.
- `blogCommentModeration` (default `true`) — if `true`, new comments start `NOT_PUBLISHED`.

## Routes (admin-only)

All under `app/tenant/[tenantId]/api/blog/`, gated by tenant `ADMIN` role:

- `categories` (GET/POST), `categories/[categoryId]` (GET/PATCH/DELETE)
- `posts` (GET/POST), `posts/[postId]` (GET/PATCH/DELETE)
- `posts/[postId]/comments` (GET/POST), `comments/[commentId]` (PATCH moderate / DELETE)

## Dependencies

`db`, `env`, `redis`, `logger`, `setting`.

## Example

```typescript
import { BlogService } from '@/modules/blog'

const post = await BlogService.posts.create(tenantId, { title, slug, content, status: 'PUBLISHED' })
await BlogService.comments.create(tenantId, post.postId, { content: 'Nice!', name: 'Guest' })
```
