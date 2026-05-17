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
