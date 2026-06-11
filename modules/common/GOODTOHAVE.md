# Good to Have — Common Primitives

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

## Locale & Internationalization Primitives

### Locale-Aware Utility Types
**Why:** A multi-country platform needs a canonical, dependency-free representation of locale (`en-US`, `tr-TR`, `de-DE`) and a validated union type for it so every downstream module (notification, invoice, dynamic page) uses the same spelling.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant may configure its own default locale; a shared type prevents divergent string literals across modules.
**Multi-country relevance:** Country-specific locale codes (e.g. `pt-BR` vs `pt-PT`) must be validated at compile time to avoid silent mismatches in date/number formatting sent to end users.

### Currency Code Enum / Validator
**Why:** ISO 4217 currency codes are currently free-form strings scattered across payment, invoice, and store modules with no shared validator.
**Complexity:** Low
**Multi-tenant relevance:** Tenants in different countries bill in different currencies; a shared enum prevents a tenant configured for `TRY` from accidentally emitting `try` or `Try` in invoice PDFs.
**Multi-country relevance:** A validated `CurrencyCode` type is the foundation for multi-currency pricing, display formatting, and rounding rules.

### Timezone Identifier Type
**Why:** IANA timezone strings (`Europe/Istanbul`, `America/New_York`) are used in scheduling, invoices, and date display with no shared type or validator, creating silent bugs when an unrecognised string is stored.
**Complexity:** Low
**Multi-tenant relevance:** Tenant administrators set their company timezone; a validated type surfaces bad values at the service boundary rather than at runtime.
**Multi-country relevance:** Servers deployed across regions may differ in local time; a canonical type ensures consistent serialisation regardless of server location.

## Error Taxonomy Improvements

### Country/Locale Error Codes
**Why:** There are no error codes for multi-country failure modes such as `UNSUPPORTED_CURRENCY`, `UNSUPPORTED_LOCALE`, `COUNTRY_RESTRICTED`, or `TAX_JURISDICTION_ERROR`.
**Complexity:** Low
**Multi-tenant relevance:** Tenants operating in restricted jurisdictions need a machine-readable error code the front end can map to a translated message rather than a generic `INTERNAL_ERROR`.
**Multi-country relevance:** Country-level business rules (currency restrictions, VAT rules, export controls) need first-class error codes to drive accurate user-facing error pages.

### Retryable vs Non-Retryable Error Distinction
**Why:** The current `AppError` has no `retryable` flag, so BullMQ workers and client SDKs cannot determine whether to retry or fail fast without duplicating that logic in every module.
**Complexity:** Low
**Multi-tenant relevance:** High-volume tenants need reliable retry semantics in background job queues (mail, webhook, payment) without each module re-implementing the same boolean check.
**Multi-country relevance:** Cross-border operations (payment gateway timeouts, regional SMS provider outages) are frequently transient; a retryable flag enables smarter retry policies per region.

### HTTP Status Helper
**Why:** Every route handler currently re-implements `err instanceof AppError ? err.statusCode : 500`; a `statusCodeFor(error)` helper in `common` would eliminate the duplication.
**Complexity:** Low
**Multi-tenant relevance:** Consistent HTTP status codes matter for tenant API integrators building retry logic against the platform.
**Multi-country relevance:** No direct country relevance, but reducing boilerplate lowers the risk of incorrect status codes reaching end users in any locale.

## Shared Value-Object Utilities

### Pagination / Cursor Types
**Why:** Every list endpoint defines its own `{ page, limit, total }` shape; a canonical `PaginatedResult<T>` and `CursorPage<T>` in `common` would standardise API responses across all modules.
**Complexity:** Low
**Multi-tenant relevance:** Tenants consuming the REST API via webhooks or SDK integrations expect a stable, consistent envelope; divergent shapes cause integration bugs.
**Multi-country relevance:** No direct country relevance, but a shared type allows locale-aware label generation (e.g. "Showing 1–20 of 100" formatted per locale) to be added in one place.

### Money Value Object
**Why:** Monetary amounts are passed as raw `number` throughout the codebase with no currency attached, making it easy to mix EUR amounts with USD amounts in arithmetic without a compile-time warning.
**Complexity:** Medium
**Multi-tenant relevance:** Multi-currency tenants need arithmetic that preserves the currency alongside the amount; a `Money { amount: number; currency: CurrencyCode }` type enforces this at the type level.
**Multi-country relevance:** Each country uses different minor units (JPY has 0 decimals, KWD has 3); a `Money` value object with a `format(locale)` method prevents silent rounding errors in invoices.

## Observability Primitives

### Structured Log Context Type
**Why:** There is no shared `LogContext` interface specifying the minimum fields (tenantId, userId, requestId, traceId) that every structured log entry should carry, so modules emit inconsistent log shapes.
**Complexity:** Low
**Multi-tenant relevance:** Filtering logs by `tenantId` in Loki / CloudWatch requires the field to be present and consistently named across all modules.
**Multi-country relevance:** A `region` field in the log context allows filtering by deployment region when the platform is deployed in multiple countries.
