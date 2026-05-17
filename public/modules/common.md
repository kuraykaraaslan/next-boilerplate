# Common Primitives

- **id:** `common`
- **tier:** infrastructure
- **version:** 1.0.0
- **dir:** `modules/common/`
- **tags:** infrastructure, core, leaf
- **icon:** `fas fa-cube`
- **hasNextLayer:** true

AppError + ErrorCode enum + error-response helper. Dependency-free leaf module loaded by every other module.

## Next layer (modules_next/) surface

- `common/axios/axios.client` _(axios, client)_
- `common/axios/index` _(axios)_
- `common/module.types` _(type)_
- `common/ui/AlertBanner` _(ui, client)_
- `common/ui/Avatar` _(ui, client)_
- `common/ui/AvatarUpload` _(ui, client)_
- `common/ui/Badge` _(ui, client)_
- `common/ui/BrandLogo` _(ui)_
- `common/ui/Breadcrumb` _(ui, client)_
- `common/ui/Button` _(ui, client)_
- `common/ui/Card` _(ui, client)_
- `common/ui/DateRangePicker` _(ui, client)_
- `common/ui/Drawer` _(ui, client)_
- `common/ui/EmptyState` _(ui, client)_
- `common/ui/FileInput` _(ui, client)_
- `common/ui/Form` _(ui, client)_
- `common/ui/Input` _(ui, client)_
- `common/ui/layout/AdminShell` _(ui, client)_
- `common/ui/layout/AppShell` _(ui, client)_
- `common/ui/layout/AppSidebar` _(ui, client)_
- `common/ui/layout/AppTopBar` _(ui, client)_
- `common/ui/layout/FontAwesomeConfig` _(ui, client)_
- `common/ui/Modal` _(ui, client)_
- `common/ui/NotificationMenu` _(ui, client)_
- `common/ui/PageHeader` _(ui, client)_
- `common/ui/Pagination` _(ui, client)_
- `common/ui/RadioGroup` _(ui, client)_
- `common/ui/RowActionsMenu` _(ui, client)_
- `common/ui/SearchBar` _(ui, client)_
- `common/ui/Select` _(ui, client)_
- `common/ui/ServerDataTable` _(ui, client)_
- `common/ui/Skeleton` _(ui, client)_
- `common/ui/SkipToContent` _(ui, client)_
- `common/ui/Spinner` _(ui, client)_
- `common/ui/TabGroup` _(ui, client)_
- `common/ui/ThemeToggle` _(ui, client)_
- `common/ui/toast.store` _(ui)_
- `common/ui/ToastContainer` _(ui, client)_
- `common/ui/Toggle` _(ui, client)_
- `common/ui/Tooltip` _(ui, client)_
- `common/utils/cn` _(util)_

## README

# common

Cross-module primitives that every other module is allowed to depend on.

Currently exposes the canonical error class and error-response helper. Anything added here must be **dependency-free** (no DB, no Redis, no env) so it can be imported safely from the deepest leaf modules without creating cycles.

## Public API

| Export | Source | Use |
|---|---|---|
| `AppError` | [app-error.ts](app-error.ts) | Throw inside services. Carries `statusCode` and an `ErrorCode`. |
| `ErrorCode` | [app-error.ts](app-error.ts) | Enum of every well-known error code (`UNAUTHORIZED`, `TENANT_NOT_FOUND`, `QUOTA_EXCEEDED`, …). |
| `toErrorResponse(error)` | [app-error.ts](app-error.ts) | Normalize an unknown error into `{ code, message }` for API responses. |

## Usage

```ts
import { AppError, ErrorCode } from "@/modules/common/app-error";

if (!user) {
  throw new AppError("User not found", 404, ErrorCode.NOT_FOUND);
}
```

In a route handler:

```ts
import { toErrorResponse } from "@/modules/common/app-error";

try {
  return NextResponse.json(await userService.get(id));
} catch (err) {
  return NextResponse.json(toErrorResponse(err), { status: err instanceof AppError ? err.statusCode : 500 });
}
```

## Error-code groups

`ErrorCode` is grouped into: Authentication, Authorization, Tenant, Billing, Rate-limiting, Resource, Server. When you need a new code, add it under the matching group in [app-error.ts](app-error.ts) and use it from the throw site — don't reuse `INTERNAL_ERROR` as a catch-all.

## Rules

- No imports from `@/modules/*` except other items in `common/`.
- No `next/*`, no `react`, no browser APIs.
- Keep this module tiny — it is loaded by everything.
