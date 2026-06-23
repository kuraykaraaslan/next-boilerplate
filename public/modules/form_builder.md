# Form Builder

- **id:** `form_builder`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/form_builder/`
- **tags:** forms, form-builder, cms, content
- **icon:** `fas fa-wpforms`
- **hasNextLayer:** true

Tenant-scoped form builder: custom forms, fields, and captured submissions.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `setting`

## Services

- `form_builder.field.service.ts`
- `form_builder.form.service.ts`
- `form_builder.service.ts`
- `form_builder.submission.service.ts`

## DTOs

- `form_builder.dto.ts`

## Entities

- `form_fields.entity.ts`
- `form_submissions.entity.ts`
- `forms.entity.ts`

## Enums

- `form_builder.enums.ts`

## Message keys

- `form_builder.messages.ts`

## Setting keys

- `form_builder.setting.keys.ts`

## TypeORM entities

- `Form` (system) — `modules/form_builder/server/entities/forms.entity.ts`
- `FormField` (system) — `modules/form_builder/server/entities/form_fields.entity.ts`
- `FormSubmission` (system) — `modules/form_builder/server/entities/form_submissions.entity.ts`

## Next layer (modules_next/) surface

- `form_builder/ui/form_builder-settings.page` _(ui, client)_
- `form_builder/ui/form-fields-panel.component` _(ui, client)_
- `form_builder/ui/form-status-badge.component` _(ui, client)_
- `form_builder/ui/form-submissions-panel.component` _(ui, client)_
- `form_builder/ui/form-submissions-settings.page` _(ui, client)_
- `form_builder/ui/form-submissions.page` _(ui, client)_
- `form_builder/ui/forms-form-id.page` _(ui, client)_
- `form_builder/ui/forms.page` _(ui, client)_

## README

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
