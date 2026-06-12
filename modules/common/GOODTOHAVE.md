# Good to Have — Common Primitives

> All items shipped. Module is production-ready for multi-tenant, multi-country use.

## Locale & Internationalization Primitives

### ✅ Locale-Aware Utility Types
Implemented in `common.locale.ts` — BCP-47 validated via `language-tags`, ISO 639-1 via `countries-list`.

### ✅ Currency Code Enum / Validator
Implemented in `common.currency.ts` — ISO 4217 sourced from `currency-codes-ts`, same package as `payment_core`.

### ✅ Timezone Identifier Type
Implemented in `common.timezone.ts` — IANA zones from `Intl.supportedValuesOf('timeZone')`, validated via `TimezoneSchema`.

## Error Taxonomy Improvements

### ✅ Country/Locale Error Codes
`UNSUPPORTED_CURRENCY`, `UNSUPPORTED_LOCALE`, `UNSUPPORTED_TIMEZONE`, `COUNTRY_RESTRICTED`, `TAX_JURISDICTION_ERROR`, `CURRENCY_MISMATCH` all in `app-error.ts → ErrorCode`.

### ✅ Retryable vs Non-Retryable Error Distinction
`AppError.retryable` flag + `isRetryable(error)` helper in `app-error.ts`.

### ✅ HTTP Status Helper
`statusCodeFor(error)` in `app-error.ts`.

## Shared Value-Object Utilities

### ✅ Pagination / Cursor Types
`PaginatedResult<T>`, `CursorPage<T>`, `PaginationDTO`, `paginate()` in `common.pagination.ts`.

### ✅ Money Value Object
`MoneySchema`, `money()`, `formatMoney()`, `addMoney()`, `subtractMoney()` in `common.money.ts`. Currency-mismatch throws `CURRENCY_MISMATCH`.

## Observability Primitives

### ✅ Structured Log Context Type
`LogContext` interface (tenantId, userId, requestId, traceId, region) in `common.log-context.ts`.
