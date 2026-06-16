# Common Primitives

- **id:** `common`
- **tier:** infrastructure
- **version:** 1.1.0
- **dir:** `modules/common/`
- **tags:** infrastructure, core, leaf, i18n
- **icon:** `fas fa-cube`
- **hasNextLayer:** true

Dependency-free leaf module loaded by every other module: AppError + ErrorCode enum (with retryable flag, statusCodeFor/isRetryable helpers) plus shared locale, country, currency, timezone, Money, pagination and log-context primitives.

## Next layer (modules_next/) surface

- `common/ui/alert-banner.component` _(ui, client)_
- `common/ui/avatar-upload.component` _(ui, client)_
- `common/ui/avatar.component` _(ui, client)_
- `common/ui/badge.component` _(ui, client)_
- `common/ui/brand-logo.component` _(ui)_
- `common/ui/breadcrumb.component` _(ui, client)_
- `common/ui/button.component` _(ui, client)_
- `common/ui/button.test.component` _(ui)_
- `common/ui/card.component` _(ui, client)_
- `common/ui/color-picker.component` _(ui, client)_
- `common/ui/context-menu.component` _(ui, client)_
- `common/ui/currency-selector.component` _(ui, client)_
- `common/ui/date-range-picker.component` _(ui, client)_
- `common/ui/demo-mode-notice.component` _(ui, client)_
- `common/ui/drawer.component` _(ui, client)_
- `common/ui/dynamic-admin-page.component` _(ui, client)_
- `common/ui/empty-state.component` _(ui, client)_
- `common/ui/file-input.component` _(ui, client)_
- `common/ui/form.component` _(ui, client)_
- `common/ui/generated/module-components` _(ui)_
- `common/ui/icon-map` _(ui)_
- `common/ui/image-gallery.component` _(ui, client)_
- `common/ui/input.component` _(ui, client)_
- `common/ui/layout/admin-shell.component` _(ui, client)_
- `common/ui/layout/app-shell.component` _(ui, client)_
- `common/ui/layout/app-sidebar.component` _(ui, client)_
- `common/ui/layout/app-top-bar.component` _(ui, client)_
- `common/ui/layout/font-awesome-config.component` _(ui, client)_
- `common/ui/modal.component` _(ui, client)_
- `common/ui/module-enabled.context.component` _(ui, client)_
- `common/ui/notification-menu.component` _(ui, client)_
- `common/ui/page-header.component` _(ui, client)_
- `common/ui/pagination.component` _(ui, client)_
- `common/ui/radio-group.component` _(ui, client)_
- `common/ui/RichTextEditor/bubble-menu.component` _(ui, client)_
- `common/ui/RichTextEditor/emoji-picker.component` _(ui, client)_
- `common/ui/RichTextEditor/image-insert-modal.component` _(ui, client)_
- `common/ui/RichTextEditor/image-overlay.component` _(ui, client)_
- `common/ui/RichTextEditor/index` _(ui, client)_
- `common/ui/RichTextEditor/markdown` _(ui)_
- `common/ui/RichTextEditor/popup-overlays.component` _(ui, client)_
- `common/ui/RichTextEditor/quill-helpers` _(ui, client)_
- `common/ui/RichTextEditor/sanitize` _(ui)_
- `common/ui/RichTextEditor/store` _(ui, client)_
- `common/ui/RichTextEditor/suggestion-popup.component` _(ui, client)_
- `common/ui/RichTextEditor/table-insert-modal.component` _(ui, client)_
- `common/ui/RichTextEditor/toolbar.component` _(ui, client)_
- `common/ui/RichTextEditor/types` _(ui)_
- `common/ui/RichTextEditor/useEditorActions` _(ui, client)_
- `common/ui/RichTextEditor/useQuillSetup` _(ui, client)_
- `common/ui/RichTextEditor/useTriggerKeyboard` _(ui, client)_
- `common/ui/row-actions-menu.component` _(ui, client)_
- `common/ui/search-bar.component` _(ui, client)_
- `common/ui/select.component` _(ui, client)_
- `common/ui/server-data-table.component` _(ui, client)_
- `common/ui/skeleton.component` _(ui, client)_
- `common/ui/skeleton.test.component` _(ui)_
- `common/ui/skip-to-content.component` _(ui, client)_
- `common/ui/slot-error-boundary.component` _(ui, client)_
- `common/ui/slot.component` _(ui, client)_
- … and 7 more

## README

# Common Module

Cross-module primitives that every other module is allowed to depend on. Exposes the canonical error class, the well-known error-code enum, an error-response helper, and a set of internationalization / value-object primitives (locale, country, currency, timezone, Money, pagination, log context).

Anything added here must be **dependency-free** (no DB, no Redis, no env, no `next/*`, no `react`) so it can be imported safely from the deepest leaf modules without creating cycles. npm **data** libraries with no runtime side effects are allowed — `currency-codes-ts` (already a dependency, used by `payment_core`) is the single source for ISO 4217 codes.

---

## Entities

None. This module owns no tables and touches no database — it is a pure infrastructure leaf.

---

## Public API

Import from the barrel `@/modules/common`, or from a specific file. The deep path `@/modules/common/app-error` is preserved unchanged.

```ts
import { AppError, ErrorCode, money, formatMoney, parseLocale } from '@/modules/common';
import { AppError } from '@/modules/common/app-error'; // still valid
```

---

## `app-error.ts` — errors

| Export | Kind | Use |
|---|---|---|
| `AppError` | class | Throw inside services. Carries `statusCode` (HTTP), a `code` (`ErrorCode`), and `retryable` (default `false`). `toJSON()` returns `{ code, message, retryable }`. |
| `ErrorCode` | const object + type | Every well-known error code and the matching union type. |
| `toErrorResponse(error)` | function | Normalize an unknown error into `{ code, message }` for API responses. |
| `statusCodeFor(error)` | function | `error instanceof AppError ? error.statusCode : 500`. Replaces the repeated inline check in route handlers. |
| `isRetryable(error)` | function | `error instanceof AppError ? error.retryable : false`. Lets BullMQ workers / SDKs decide retry-vs-fail-fast. |

Constructor is backward compatible — existing 3-arg calls still work; pass `{ retryable: true }` as the optional 4th arg:

```ts
throw new AppError('Gateway timed out', 503, ErrorCode.INTERNAL_ERROR, { retryable: true });

// route handler
catch (err) {
  return NextResponse.json(toErrorResponse(err), { status: statusCodeFor(err) });
}
```

### Error-code groups

Authentication & Session, Authorization, Tenant, Billing, Rate limiting, Resources, **Internationalization & Jurisdiction** (`UNSUPPORTED_CURRENCY`, `UNSUPPORTED_LOCALE`, `UNSUPPORTED_TIMEZONE`, `COUNTRY_RESTRICTED`, `TAX_JURISDICTION_ERROR`, `CURRENCY_MISMATCH`), Server. Add new codes under the matching group — don't reuse `INTERNAL_ERROR` as a catch-all.

---

## `common.locale.ts` — BCP-47 locales

| Export | Kind | Use |
|---|---|---|
| `LocaleCodeEnum` | Zod enum | Curated supported locales (`en-US`, `tr-TR`, `de-DE`, …). |
| `LocaleCode` | type | `z.infer<typeof LocaleCodeEnum>`. |
| `DEFAULT_LOCALE` | const | `'en-US'`. |
| `LOCALES` | array | `{ code, label, nativeLabel }[]` for dropdowns. |
| `isLocaleCode(v)` | guard | Exact membership check. |
| `parseLocale(input?)` | function | Normalises casing/underscores, resolves a bare language (`tr` → `tr-TR`), returns `null` if unknown. |

```ts
parseLocale('tr');     // 'tr-TR'
parseLocale('EN-us');  // 'en-US'
parseLocale('zz');     // null
```

---

## `common.country.ts` — ISO 3166-1 alpha-2

| Export | Kind | Use |
|---|---|---|
| `CountryCodeEnum` | Zod enum | Full ISO 3166-1 alpha-2 set (~249 codes), derived from `COUNTRIES`. |
| `CountryCode` | type | `z.infer<…>`. |
| `COUNTRIES` | array | `{ code, name }[]` (English short names). |
| `isCountryCode(v)` | guard | Membership check (uppercase). |

---

## `common.currency.ts` — ISO 4217

| Export | Kind | Use |
|---|---|---|
| `CurrencyCodeEnum` | Zod enum | `z.enum(codes())` from `currency-codes-ts` — same source as `payment_core`. |
| `CurrencyCode` | type | `z.infer<…>`. |
| `DEFAULT_CURRENCY` | const | `'USD'`. |
| `isCurrencyCode(v)` | guard | Membership check (uppercase). |

---

## `common.timezone.ts` — IANA timezones

| Export | Kind | Use |
|---|---|---|
| `TIMEZONES` | `string[]` | `Intl.supportedValuesOf('timeZone')`, computed once. |
| `isTimezone(v)` | function | Case-sensitive membership check (also accepts the `UTC` default, which Intl omits in some runtimes). |
| `TimezoneSchema` | Zod schema | `z.string().refine(isTimezone, 'Invalid IANA timezone')`. |
| `Timezone` | type | `z.infer<…>` (string). |
| `DEFAULT_TIMEZONE` | const | `'UTC'`. |

---

## `common.money.ts` — Money value object

| Export | Kind | Use |
|---|---|---|
| `MoneySchema` | Zod schema | `{ amount: number, currency: CurrencyCodeEnum }`. |
| `Money` | type | `z.infer<…>`. |
| `money(amount, currency)` | function | Construct a `Money`. |
| `formatMoney(m, locale?)` | function | `Intl.NumberFormat` currency string; Intl handles minor units (JPY 0, KWD 3). Defaults to `DEFAULT_LOCALE`. |
| `addMoney`, `subtractMoney` | functions | Same-currency arithmetic; throw `AppError(…, 422, CURRENCY_MISMATCH)` on mismatch. |
| `multiplyMoney(m, factor)` | function | Scale by a unitless factor. |

```ts
formatMoney(money(1234.5, 'USD'), 'en-US'); // "$1,234.50"
formatMoney(money(1234, 'JPY'), 'en-US');   // "¥1,234"
addMoney(money(10, 'USD'), money(5, 'EUR')); // throws CURRENCY_MISMATCH (422)
```

---

## `common.pagination.ts` — pagination envelopes

| Export | Kind | Use |
|---|---|---|
| `PaginatedResult<T>` | interface | `{ items, total, page, limit, pageCount }`. |
| `CursorPage<T>` | interface | `{ items, nextCursor, hasMore }`. |
| `PaginationDTO` | Zod DTO | `page` (≥1, default 1), `limit` (1–100, default 20), both coerced. |
| `PaginationInput` | type | `z.infer<…>`. |
| `paginate(items, total, page, limit)` | function | Wraps a page slice, computing `pageCount` via ceiling division. |

---

## `common.log-context.ts` — structured logging

| Export | Kind | Use |
|---|---|---|
| `LogContext` | interface | Optional `tenantId`, `userId`, `requestId`, `traceId`, `region` — the minimum fields every structured log entry should carry. |

---

## Settings

None. This module reads no settings and exposes no admin-settings keys.

---

## Rules

- No imports from `@/modules/*` except other items in `common/`.
- No `next/*`, no `react`, no browser APIs, no DB / Redis / env access. (Pure npm data libs like `currency-codes-ts` are allowed.)
- Domain enums use Zod (`z.enum`), never TS `enum`; types derive via `z.infer` / `type`.
- Keep this module tiny — it is loaded by everything.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-11.

No per-tenant variability in the primitives themselves — they are dependency-free constants/validators. They are the *foundation* tenants build on: a tenant may pick its own `DEFAULT_LOCALE`, `DEFAULT_CURRENCY`, or company timezone, but that selection lives in tenant settings elsewhere; this module only guarantees the canonical spelling and validation.

---

## Dependencies

None (`requires: []`). This is a leaf module; every other module may depend on it.
