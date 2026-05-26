# SEO Metadata

- **id:** `seo`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/seo/`
- **tags:** seo, metadata
- **icon:** `fas fa-search`
- **hasNextLayer:** true

Polymorphic SEO metadata (title, description, Open Graph, canonical, noIndex) attachable to any entity type via entityType + entityId pair.

## Dependencies

- **requires:** `db`, `redis`

## Services

- `seo.service.ts`

## DTOs

- `seo.dto.ts`

## Entities

- `seo_meta.entity.ts`

## Enums

- `seo.enums.ts`

## Message keys

- `seo.messages.ts`

## Owned API routes

- `tenant` GET/PUT `/tenant/[tenantId]/api/seo/[entityType]/[entityId]`

## TypeORM entities

- `SeoMeta` (system) — `modules/seo/entities/seo_meta.entity.ts`

## Next layer (modules_next/) surface

- `seo/ui/SeoPanel` _(ui, client)_
