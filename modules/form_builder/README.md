# Form Builder Module

Tenant-scoped form builder: custom forms, configurable fields, and captured
submissions. Every row is isolated by `tenantId` and every service method takes
`tenantId` as its first argument (per `multi-tenancy-patterns.md`).

> Scaffolded skeleton — entities, types and a placeholder service only.
> Business logic and API routes are coming soon.

## Entities

- `Form` (`forms`) — `title`, `slug`, `status` (`DRAFT`/`PUBLISHED`/`ARCHIVED`); soft-deletable.
- `FormField` (`form_fields`) — `formId`, `label`, `type`, `required`, `order`.
- `FormSubmission` (`form_submissions`) — `formId`, `data` (captured JSON payload).

## Menu

- **Forms** — `/admin/forms` (workspace `content`).
- **Submissions** — `/admin/forms/submissions` (workspace `content`).

## Public API

Import from the barrel `@kuraykaraaslan/form_builder`:

| Export | Type | Use |
|---|---|---|
| `FormBuilderService` | class | Facade (placeholder — methods are future work) |
| `FormStatusEnum` | Zod | Form lifecycle status |
| `Create*DTO` | Zod | Input validation |
| `Safe*Schema` | Zod | Output filtering (omits `deletedAt`) |
| `FORM_BUILDER_MESSAGES` | object | Error/message constants |

## Dependencies

`db`, `env`, `redis`, `logger`, `setting`.
