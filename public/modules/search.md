# Search

- **id:** `search`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/search/`
- **tags:** platform, search, full-text
- **icon:** `fas fa-magnifying-glass`
- **hasNextLayer:** true

Tenant-scoped full-text search over arbitrary content. Owning modules push documents (title/body/url/metadata keyed by entityType+entityId); the default PostgreSQL FTS provider ranks results with ts_rank and returns ts_headline snippets. Provider abstraction leaves room for Meilisearch/Elastic. All queries are parameterized and tenant-scoped.

## Dependencies

- **requires:** `db`, `env`, `redis`, `common`

## Services

- `search.service.ts`

## DTOs

- `search.dto.ts`

## Entities

- `search_document.entity.ts`

## Enums

- `search.enums.ts`

## Message keys

- `search.messages.ts`

## TypeORM entities

- `SearchDocument` (system) — `modules/search/server/entities/search_document.entity.ts`

## Next layer (modules_next/) surface

- `search/ui/search.page` _(ui, client)_

## README

# search

Tenant-scoped **full-text search** over arbitrary content. Owning modules push
documents into the index; consumers query them ranked by relevance.
Framework-agnostic (`modules/` layer); the Next bindings (admin console + API
routes) live under `app/`.

## What it does

A `SearchDocument` represents one searchable source record, identified by
`(entityType, entityId)` — e.g. `('blog_post', '42')`. Owning modules call
`SearchService.index()` whenever their data changes and `remove()` on deletion.
Re-indexing the same source **upserts** on the `(tenantId, entityType, entityId)`
unique key.

The default **PostgreSQL FTS provider**:

- Builds the document `tsvector` from `title || ' ' || body` at query time.
- Parses the user query with **`websearch_to_tsquery`** (Google-style syntax:
  quoted phrases, `or`, `-exclude`).
- Ranks with **`ts_rank`** (most relevant first) and returns a
  **`ts_headline`** snippet with `<b>…</b>` match markers.
- Binds all user input as SQL **parameters** — never interpolated — so it is
  injection-safe, and constrains every query to `tenantId`.

The query string is normalized (control chars stripped, whitespace collapsed,
capped at 200 chars) and a blank query throws `EMPTY_QUERY` (400).

## Public API

```ts
import { SearchService } from "@/modules/search";

// Keep the index in sync (call from the owning module's create/update/delete)
await SearchService.index(tenantId, {
  entityType: "blog_post",
  entityId: post.id,
  title: post.title,
  body: post.contentText,
  url: `/blog/${post.slug}`,
  metadata: { author: post.authorName },
});
await SearchService.remove(tenantId, "blog_post", post.id);

// Query
const { hits, total } = await SearchService.search(tenantId, "checkout -legacy", {
  entityType: "blog_post", // optional filter
  limit: 20,
  offset: 0,
});
```

Pure helpers are exported for reuse: `normalizeQuery(raw)`, `isBlankQuery(raw)`.

## Provider abstraction

`SearchProviderBase` (`providers/base.provider.ts`) defines `index` / `remove` /
`search`. `getSearchProvider()` (`search.provider-factory.ts`) returns the active
backend. Adding Meilisearch/Elastic = implement the base class + a factory case;
`SearchProviderEnum` is the extension point.

## Entities

| Entity | Table | Notes |
|---|---|---|
| `SearchDocument` | `search_documents` | Unique `(tenantId, entityType, entityId)`. Holds title/body/url/metadata + `language`. |

## Dependencies

`db`, `env`, `redis`, `common`.

## HTTP surface

- `GET /tenant/{tenantId}/api/search?q=…&entityType=…&limit=&offset=` — search (authenticated)
- `POST /tenant/{tenantId}/api/search/index` — upsert a document (admin)
- `DELETE /tenant/{tenantId}/api/search/index` — remove a document (admin)

Admin console: `/tenant/{tenantId}/admin/search`.
