# API Documentation

- **id:** `api_doc`
- **tier:** infrastructure
- **version:** 1.0.0
- **dir:** `modules/api_doc/`
- **tags:** platform, documentation
- **icon:** `fas fa-book`
- **hasNextLayer:** true

OpenAPI/Swagger spec builder + helpers for serving per-tenant API docs.

## Dependencies

- **requires:** `env`, `setting`

## Services

- `api_doc.service.ts`

## Next layer (modules_next/) surface

- `api_doc/ui/api-docs-page.component` _(ui, client)_
- `api_doc/ui/api-tag-section.component` _(ui, client)_
- `api_doc/ui/code-sample-panel.component` _(ui, client)_
- `api_doc/ui/endpoint-row.component` _(ui, client)_
- `api_doc/ui/http-method-badge.component` _(ui)_
- `api_doc/ui/mockSpec` _(ui)_
- `api_doc/ui/operation-panel.component` _(ui, client)_
- `api_doc/ui/parameter-table.component` _(ui)_
- `api_doc/ui/response-card.component` _(ui, client)_
- `api_doc/ui/schema-viewer.component` _(ui, client)_
- `api_doc/ui/security-scheme-badge.component` _(ui)_
- `api_doc/ui/server-selector.component` _(ui, client)_
- `api_doc/ui/status-code-badge.component` _(ui)_
- `api_doc/ui/try-it-out-panel.component` _(ui, client)_
- `api_doc/ui/types` _(ui)_

## README

# Api Doc Module

UI-only module that renders interactive OpenAPI documentation. It takes an `ApiSpec` object and displays the info header, security schemes, and per-tag endpoint sections with parameters, request/response schemas, and code samples. No service, no database entity, no API routes.

Source lives under `modules_next/api_doc/ui/`.

---

## Files

| File | Purpose |
|---|---|
| `ui/types.ts` | OpenAPI-style type definitions (`ApiSpec`, `Operation`, `PathItem`, `Parameter`, `SchemaObject`, `ApiResponse`, `SecurityScheme`, `Server`, `Tag`, `CodeSample`, …) |
| `ui/ApiDocsPage.tsx` | Root component; renders the spec header, security-scheme panel, common-responses panel, and one `ApiTagSection` per tag |
| `ui/ApiTagSection.tsx` | Collapsible section grouping endpoints under a tag |
| `ui/EndpointRow.tsx` | Collapsible row for one operation (method badge, path, lock/deprecated icons); expands to `OperationPanel` |
| `ui/OperationPanel.tsx` | Tabbed detail view: Parameters, Request Body, Responses, and Code Samples (tab shown only when samples exist) |
| `ui/ParameterTable.tsx` | Table of path/query/header/cookie parameters |
| `ui/SchemaViewer.tsx` | Renders a `SchemaObject` (request/response body schema) |
| `ui/ResponseCard.tsx` | Collapsible card for a single response (2xx open by default) |
| `ui/CodeSamplePanel.tsx` | Multi-language code-sample viewer |
| `ui/HttpMethodBadge.tsx` | Colored HTTP-method badge |
| `ui/StatusCodeBadge.tsx` | HTTP status-code badge |
| `ui/SecuritySchemeBadge.tsx` | Badge for a security scheme (`apiKey`, `http`, `oauth2`, …) |
| `ui/ServerSelector.tsx` | Server/environment selector |
| `ui/mockSpec.ts` | Two ready-made specs: `SYSTEM_SPEC` (platform/system API) and `TENANT_SPEC` (per-tenant API) |

---

## Variants

The same `ApiDocsPage` renders two specs depending on who is viewing:

| Spec | Scope | Shown to |
|---|---|---|
| `SYSTEM_SPEC` | Platform/system API (users, tenants, plans, audit logs) | Root-tenant admins |
| `TENANT_SPEC` | Per-tenant API (members, invitations, settings, domains) | Regular tenants |

Both currently come from `ui/mockSpec.ts`. Swap in a real spec fetched at runtime when one is available.

---

## Usage

Pass an `ApiSpec` to the root component:

```tsx
import { ApiDocsPage } from '@/modules_next/api_doc/ui/ApiDocsPage';
import { SYSTEM_SPEC, TENANT_SPEC } from '@/modules_next/api_doc/ui/mockSpec';

<ApiDocsPage spec={TENANT_SPEC} />
```

Consumed by two app pages, which select the variant by role:

- `app/tenant/[tenantId]/admin/(tenant-scope)/api-docs/page.tsx` — root tenant gets `SYSTEM_SPEC`, others get `TENANT_SPEC` (via `isRootTenant`).
- `app/tenant/[tenantId]/api-docs/page.tsx` — always `TENANT_SPEC`.

---

## Settings

| Key | Type | Default | Purpose |
|---|---|---|---|
| `apiDocsPublic` | boolean | `false` | When true, allows a public-facing variant of the spec to be served without a logged-in session. |

Field metadata lives in `modules/api_doc/api_doc.settings.fields.ts` (`API_DOC_SETTINGS_FIELDS`, group `Visibility`).

### Public docs

By default the docs pages rely on page-level session auth (admin and tenant routes are always private). The `apiDocsPublic` per-tenant setting opts a tenant into a public, session-less docs variant.

- `modules/api_doc/api_doc.service.ts` exposes `ApiDocService.isPublic(tenantId): Promise<boolean>`, which reads the setting via `SettingService.getValue` and returns `true` only when the stored value is `'true'`. It defaults to `false` on any error or when unset.
- A future public route can call `ApiDocService.isPublic(tenantId)` to decide whether to serve docs without a session. No public route or auth-middleware change ships with this module yet — internal/admin routes remain private regardless of this setting.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

No per-tenant variability — API documentation viewer module that renders interactive OpenAPI specs in two variants (system-level and tenant-level) based on user role; pure UI with no services, entities, or settings.

---

## Dependencies

- `env` (per `module.json`)
- Shared UI from `modules_next/common` (`cn`, `TabGroup`, `Badge`) and Font Awesome icons
