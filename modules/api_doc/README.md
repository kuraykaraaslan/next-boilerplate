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
