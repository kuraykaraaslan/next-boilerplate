# Payment Sell Module

One-time product / service payment processing. It owns the `Payment` and `PaymentTransaction` records and delegates the actual gateway work (checkout sessions, refunds, status, customer portal, webhooks) to the shared **payment_core** providers (Stripe, PayPal, Iyzico, Alipay, WeChat Pay, YooKassa, CloudPayments). Checkout, lookups, and refunds are tenant-aware; the chosen provider reads each tenant's own API credentials from payment_core settings.

---

## Entities

| Entity | Table | DB | Description |
|---|---|---|---|
| `Payment` | `payments` | tenant | A single one-time charge: provider, `providerPaymentId`, amount/currency, status, customer + billing details, refund and failure fields, soft-deleted (`deletedAt`). Indexed on `userId`, `tenantId`, `provider`, `providerPaymentId`, `currency`, `status`, `createdAt`. |
| `PaymentTransaction` | `payment_transactions` | system | A ledger entry attached to a `Payment` (`type` = `PAYMENT`/`REFUND`/`CHARGEBACK`/`PAYOUT`): amount, `fee`, `net`, raw `providerResponse`, error fields, optional `parentTransactionId`, and request context (`ipAddress`, `userAgent`). Has no `tenantId` column, so it lives in the system DB. |

---

## Services

### `PaymentSellService` (`payment_sell.service.ts`)

Holds a static `PROVIDERS` map of the seven payment_core providers and resolves one with `getProvider(name)`.

| Method | Responsibility |
|---|---|
| `createCheckout(tenantId, data)` | Calls `provider.createCheckoutSession(tenantId, …)`, persists a `PENDING` `Payment` (storing the returned `sessionId` as `providerPaymentId`), and returns a `CheckoutResult` (`paymentId`, `sessionId`, `checkoutUrl`, `provider`, `expiresAt`). |
| `getById(tenantId, paymentId)` | Single-flighted lookup of one payment, returned as `SafePayment` (omits `deletedAt`). |
| `getWithTransactions(tenantId, paymentId)` | Payment plus its transactions (newest first). |
| `list(tenantId, query)` | Paginated, filterable list (`userId`, `provider`, `status`, `currency`, date range) ordered by `createdAt DESC`. |
| `update(tenantId, paymentId, data)` | Patches a payment; auto-stamps `paidAt`/`cancelledAt`/`refundedAt` when status moves to `COMPLETED`/`CANCELLED`/`REFUNDED`, then busts the `pay:sell:*` caches. |
| `refund(tenantId, paymentId, dto)` | Refunds via `provider.refundPayment` when supported; only `COMPLETED`/`PARTIALLY_REFUNDED` payments are eligible and the cumulative refund may not exceed the original amount. Sets status to `REFUNDED` (full) or `PARTIALLY_REFUNDED`. |
| `createTransaction(tenantId, data)` | Inserts a `PaymentTransaction` and busts that payment's transaction cache. |
| `listTransactions(tenantId, query)` | Paginated transactions filtered by `paymentId`, `type`, `status`. |
| `getProviderStatus(tenantId, token, provider)` | Proxies `provider.getPaymentStatus(tenantId, token)`. |
| `getCustomerPortal(tenantId, provider, customerExternalId?, customerEmail?, returnUrl?)` | Creates a provider customer-portal session; `returnUrl` defaults to `'/'`. |

Reads are cached/deduplicated with Redis (`singleFlight`, keys `pay:sell:<paymentId>` and `pay:sell:tx:<paymentId>`) and invalidated on writes.

### `PaymentSellWebhookService` (`payment_sell.webhook.service.ts`)

`handle(event, provider)` consumes a payment_core `NormalizedWebhookEvent`. It requires `event.tenantId`, opens that tenant's DataSource, finds the `Payment` by `providerPaymentId`, and maps the normalized action to a status update via `PaymentSellService.update`:

| Action | Effect |
|---|---|
| `payment.completed` | status → `COMPLETED` |
| `payment.failed` | status → `FAILED` (+ `failureCode` / `failureMessage`) |
| `payment.expired` | status → `EXPIRED` |
| `payment.refunded` | status → `REFUNDED` |

Unknown actions and missing payments are logged and skipped (no throw); processing errors are logged and rethrown.

---

## Enums & DTOs

- **Enums** (`payment_sell.enums.ts`): `PaymentStatusEnum` (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`, `CANCELLED`, `EXPIRED`), `TransactionTypeEnum` (`PAYMENT`/`REFUND`/`CHARGEBACK`/`PAYOUT`), `TransactionStatusEnum` (`PENDING`/`PROCESSING`/`COMPLETED`/`FAILED`/`CANCELLED`). Provider/method/currency enums are re-exported from payment_core.
- **DTOs** (`payment_sell.dto.ts`): `CreatePaymentDTO` (requires `provider`, `amount`, `currency`, `successUrl`, `cancelUrl`), `UpdatePaymentDTO`, `GetPaymentsQuery`, `RefundPaymentDTO`, `CreateTransactionDTO`, `GetTransactionsQuery`. Zod output schemas (`SafePayment`, `PaymentWithTransactions`, `CheckoutResult`, `PaymentTransaction`) live in `payment_sell.types.ts`.

---

## Settings

This module declares **no settings of its own**. All provider configuration — which gateways are enabled and their API credentials/sandbox flags (`stripeSecretKey`, `paypalClientId`/`Secret`, `iyzicoApiKey`, `<provider>Enabled`, …) — lives in **payment_core** (`payment_core.setting.keys.ts`) and is read per tenant by the providers it delegates to.

---

## Usage

```typescript
import { PaymentSellService } from '@/modules/payment_sell'

// Start a one-time checkout for a tenant
const checkout = await PaymentSellService.createCheckout(tenantId, {
  provider: 'STRIPE',
  amount: 1299.99,
  currency: 'USD',
  successUrl: 'https://app.example.com/checkout/success',
  cancelUrl: 'https://app.example.com/checkout/cancel',
  customerEmail: 'buyer@example.com',
})
// → { paymentId, sessionId, checkoutUrl, provider, expiresAt }

// Later, refund (full or partial) — only COMPLETED / PARTIALLY_REFUNDED are eligible
await PaymentSellService.refund(tenantId, checkout.paymentId, { amount: 29.5, reason: 'one item returned' })
```

`payment_return_rma` calls `PaymentSellService.refund(tenantId, paymentId, …)` when an approved RMA carries a `paymentId`.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Processes one-time product/service payments (checkout, refunds, transactions, webhooks) by delegating to payment_core providers; it is fully tenant-aware — payments are stored in each tenant's DB via tenantDataSourceFor(tenantId) and the chosen provider reads that tenant's API credentials — but the module itself declares no settings, so its only per-tenant config lives in payment_core.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `Payment` | `payments` | provider, providerPaymentId, amount, currency, status, paymentMethod, description, metadata, customerEmail, customerName, customerPhone, billingAddress, refundedAmount, failureCode, failureMessage |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `payment_sell.service.ts:createCheckout` — Resolves a tenant-scoped DataSource via tenantDataSourceFor(tenantId) and calls provider.createCheckoutSession(tenantId, ...); each provider then reads that tenant's own API credentials (stripeSecretKey, paypalClientId/Secret, iyzicoApiKey, etc.) from SettingService.getValue(tenantId, key) in payment_core — so which keys/account the charge runs against, and whether sandbox vs live, is per tenant.
- `payment_sell.service.ts:refund` — Calls provider.refundPayment(tenantId, ...) which authenticates with the requesting tenant's provider credentials; refunds execute against that tenant's payment account.
- `payment_sell.service.ts:getProviderStatus / getCustomerPortal` — Both pass tenantId into the provider so status lookups and customer-portal session creation use the tenant's provider credentials; portal availability also depends on which provider the tenant routed through.
- `payment_sell.webhook.service.ts:handle` — Reads event.tenantId, opens that tenant's DataSource, and looks up/updates the payment in the correct tenant DB — webhook side effects are isolated per tenant.
- `payment_sell.service.ts (all reads/writes: getById, list, update, refund, createCheckout)` — Every Payment query is scoped with where:{ tenantId } against tenantDataSourceFor(tenantId), so each tenant only ever sees/mutates its own payments.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Allowed/enabled payment providers are not gated per tenant — createCheckout/createTransaction accept any provider from the DTO (PaymentProviderEnum) and look it up in the hardcoded static PROVIDERS map; a tenant can request STRIPE/PAYPAL/IYZICO/ALIPAY/etc. even if it has no credentials configured for it (the failure only surfaces later when the provider reads empty settings). | `payment_sell.service.ts:getProvider / createCheckout (static PROVIDERS map)` | Tenants operate in different regions and onboard different providers; checkout should be restricted to the providers a tenant has actually enabled. payment_core already exposes per-tenant <provider>Enabled flags (stripeEnabled, paypalEnabled, ...) that are not consulted here, so a tenant admin's enable/disable choice has no effect on what createCheckout will attempt. | `enabledPaymentProviders` |
| No per-tenant default payment provider — callers must always pass data.provider explicitly; there is no tenant-level fallback when none is specified. | `payment_sell.dto.ts:CreatePaymentDTO.provider (required) / service createCheckout` | Most tenants have one primary provider; a per-tenant default would let checkout omit the provider and route to the tenant's preferred gateway, and pairs naturally with the enabled-providers gate above. | `defaultPaymentProvider` |
| Customer-portal returnUrl falls back to the global literal '/' when the caller omits it. | `payment_sell.service.ts:getCustomerPortal (returnUrl ?? '/')` | Each tenant has its own app/branding domain; the post-portal landing page should default to a tenant-configured billing/return URL rather than the root path. | `billingPortalReturnUrl` |
| Refund eligibility/limits are fixed in code — only COMPLETED/PARTIALLY_REFUNDED payments are refundable and refunds are capped only at the original amount; there is no per-tenant refund window or partial-refund policy. | `payment_sell.service.ts:refund` | Refund policy (allowed window in days, whether partial refunds are permitted) is a business decision that commonly varies per merchant/tenant; today it is globally hardcoded. | `refundWindowDays` |

---

## Dependencies

`db`, `env`, `setting`, `redis`, `logger`, `payment_core`.
