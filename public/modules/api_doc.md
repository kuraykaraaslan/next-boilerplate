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

- **requires:** `env`

## Next layer (modules_next/) surface

- `api_doc/ui/ApiDocsPage` _(ui, client)_
- `api_doc/ui/ApiTagSection` _(ui, client)_
- `api_doc/ui/CodeSamplePanel` _(ui, client)_
- `api_doc/ui/EndpointRow` _(ui, client)_
- `api_doc/ui/HttpMethodBadge` _(ui)_
- `api_doc/ui/mockSpec` _(ui)_
- `api_doc/ui/OperationPanel` _(ui, client)_
- `api_doc/ui/ParameterTable` _(ui)_
- `api_doc/ui/ResponseCard` _(ui, client)_
- `api_doc/ui/SchemaViewer` _(ui, client)_
- `api_doc/ui/SecuritySchemeBadge` _(ui)_
- `api_doc/ui/ServerSelector` _(ui, client)_
- `api_doc/ui/StatusCodeBadge` _(ui)_
- `api_doc/ui/types` _(ui)_

## README

# api_doc module

UI-only module for rendering interactive API documentation pages. Displays OpenAPI-style operation details, parameters, responses, and code samples. No backend service.

---

## Files

| File | Purpose |
|---|---|
| `ui/types.ts` | Types for spec structure |
| `ui/*.tsx` | 14 UI components for API doc rendering |
| `mockSpec.ts` | Mock OpenAPI spec for development/preview |

---

## Usage

This module is consumed by the API documentation admin page. Pass an OpenAPI spec object to the root component:

```tsx
import { ApiDocViewer } from '@/modules/api_doc/ui/api-doc-viewer';
import { mockSpec } from '@/modules/api_doc/mockSpec';

<ApiDocViewer spec={mockSpec} />
```

---

## Notes

- No service, no database entity, no API routes
- Uses the mock spec during development; in production, swap with a real spec fetched from `/api/spec` or loaded from file
