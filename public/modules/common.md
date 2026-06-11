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
- `common/ui/ColorPicker` _(ui, client)_
- `common/ui/ContextMenu` _(ui, client)_
- `common/ui/CurrencySelector` _(ui, client)_
- `common/ui/DateRangePicker` _(ui, client)_
- `common/ui/Drawer` _(ui, client)_
- `common/ui/EmptyState` _(ui, client)_
- `common/ui/FileInput` _(ui, client)_
- `common/ui/Form` _(ui, client)_
- `common/ui/ImageGallery` _(ui, client)_
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
- `common/ui/RichTextEditor/BubbleMenu` _(ui, client)_
- `common/ui/RichTextEditor/EmojiPicker` _(ui, client)_
- `common/ui/RichTextEditor/ImageInsertModal` _(ui, client)_
- `common/ui/RichTextEditor/ImageOverlay` _(ui, client)_
- `common/ui/RichTextEditor/index` _(ui, client)_
- `common/ui/RichTextEditor/markdown` _(ui)_
- `common/ui/RichTextEditor/PopupOverlays` _(ui, client)_
- `common/ui/RichTextEditor/quill-helpers` _(ui, client)_
- `common/ui/RichTextEditor/sanitize` _(ui)_
- `common/ui/RichTextEditor/store` _(ui, client)_
- `common/ui/RichTextEditor/SuggestionPopup` _(ui, client)_
- `common/ui/RichTextEditor/TableInsertModal` _(ui, client)_
- `common/ui/RichTextEditor/Toolbar` _(ui, client)_
- `common/ui/RichTextEditor/types` _(ui)_
- `common/ui/RichTextEditor/useEditorActions` _(ui, client)_
- `common/ui/RichTextEditor/useQuillSetup` _(ui, client)_
- `common/ui/RichTextEditor/useTriggerKeyboard` _(ui, client)_
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
- … and 3 more

## README

# Common Module

Cross-module primitives that every other module is allowed to depend on. Currently exposes the canonical error class, the well-known error-code enum, and an error-response helper. Anything added here must be **dependency-free** (no DB, no Redis, no env, no `next/*`, no `react`) so it can be imported safely from the deepest leaf modules without creating cycles.

---

## Entities

None. This module owns no tables and touches no database — it is a pure infrastructure leaf.

---

## Public API

All exports live in [`app-error.ts`](app-error.ts).

| Export | Kind | Use |
|---|---|---|
| `AppError` | class | Throw inside services. Carries `statusCode` (HTTP) and a `code` (`ErrorCode`); `toJSON()` returns `{ code, message }`. |
| `ErrorCode` | const enum + type | Object of every well-known error code (`UNAUTHORIZED`, `TENANT_NOT_FOUND`, `QUOTA_EXCEEDED`, …) and the matching union type. |
| `toErrorResponse(error)` | function | Normalize an unknown error into `{ code, message }` for API responses. `AppError` keeps its code; any other `Error` maps to `INTERNAL_ERROR` with its message; non-errors map to `INTERNAL_ERROR` with a generic message. |

The `module.json` manifest declares these three exports, no dependencies (`requires: []`), and `priority: 1` so it loads first. `index.ts` is intentionally empty — import from `app-error.ts` directly.

---

## Error-code groups

`ErrorCode` is grouped in source as:

| Group | Codes |
|---|---|
| Authentication & Session | `UNAUTHORIZED`, `SESSION_EXPIRED`, `INVALID_CREDENTIALS`, `OTP_REQUIRED`, `TOTP_REQUIRED` |
| Authorization | `FORBIDDEN`, `INSUFFICIENT_PERMISSIONS`, `INSUFFICIENT_SCOPE` |
| Tenant | `TENANT_NOT_FOUND`, `TENANT_INACTIVE`, `TENANT_SUSPENDED`, `NOT_TENANT_MEMBER` |
| Billing | `SUBSCRIPTION_REQUIRED`, `SUBSCRIPTION_EXPIRED`, `GRACE_PERIOD_EXPIRED`, `SEAT_LIMIT_REACHED`, `FEATURE_NOT_AVAILABLE`, `QUOTA_EXCEEDED` |
| Rate limiting | `RATE_LIMIT_EXCEEDED` |
| Resources | `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR` |
| Server | `INTERNAL_ERROR` |

When you need a new code, add it under the matching group in [`app-error.ts`](app-error.ts) and use it from the throw site — don't reuse `INTERNAL_ERROR` as a catch-all.

---

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

---

## Settings

None. This module reads no settings and exposes no admin-settings keys.

---

## Rules

- No imports from `@/modules/*` except other items in `common/`.
- No `next/*`, no `react`, no browser APIs, no DB / Redis / env access.
- Keep this module tiny — it is loaded by everything.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

No per-tenant variability — Cross-module primitives (AppError, ErrorCode, toErrorResponse) with zero tenant variability — a dependency-free infrastructure leaf module intentionally designed to have no per-tenant logic, settings, or data.

---

## Dependencies

None (`requires: []`). This is a leaf module; every other module may depend on it.
