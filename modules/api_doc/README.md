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

None. This module has no setting keys, no entities, and no API routes.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

No per-tenant variability — API documentation viewer module that renders interactive OpenAPI specs in two variants (system-level and tenant-level) based on user role; pure UI with no services, entities, or settings.

---

## Dependencies

- `env` (per `module.json`)
- Shared UI from `modules_next/common` (`cn`, `TabGroup`, `Badge`) and Font Awesome icons
