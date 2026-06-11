# Payment

- **id:** `payment`
- **tier:** billing
- **version:** 1.0.0
- **dir:** `modules/payment/`
- **tags:** billing, payment
- **icon:** `fas fa-credit-card`
- **hasNextLayer:** true

Pluggable payment processing (Stripe, PayPal, Iyzico) + subscription plans, plan features, payment transactions, webhook handling.

## Dependencies

- **requires:** `db`, `env`, `setting`, `common`

## Services

- `payment.checkout.service.ts`
- `payment.crud.service.ts`
- `payment.proration.service.ts`
- `payment.service.ts`
- `payment.transaction.service.ts`
- `payment.webhook.handlers.service.ts`
- `payment.webhook.notifications.service.ts`
- `payment.webhook.payment.service.ts`
- `payment.webhook.paypal.service.ts`
- `payment.webhook.service.ts`
- `payment.webhook.stripe.service.ts`
- `payment.webhook.subscription.service.ts`

## DTOs

- `payment.dto.ts`

## Entities

- `payment.entity.ts`
- `payment_transaction.entity.ts`
- `plan_feature.entity.ts`
- `subscription_plan.entity.ts`

## Enums

- `payment.enums.ts`

## Message keys

- `payment.messages.ts`

## Setting keys

- `payment.setting.keys.ts`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/payments`
- `tenant` GET/PUT/DELETE `/tenant/[tenantId]/api/payments/[paymentId]`
- `tenant` POST `/tenant/[tenantId]/api/payments/[paymentId]/refund`
- `tenant` GET/POST `/tenant/[tenantId]/api/payments/[paymentId]/transactions`
- `tenant` POST `/tenant/[tenantId]/api/payments/bin-check`
- `tenant` POST `/tenant/[tenantId]/api/payments/provider-status`
- `tenant` GET `/tenant/[tenantId]/api/payments/providers`
- `tenant` GET/PUT `/tenant/[tenantId]/api/payments/transactions/[transactionId]`
- `tenant` GET `/tenant/[tenantId]/api/payments/wallets`

## TypeORM entities

- `Payment` (system) — `modules/payment/entities/payment.entity.ts`
- `PaymentTransaction` (system) — `modules/payment/entities/payment_transaction.entity.ts`
- `PlanFeature` (system) — `modules/payment/entities/plan_feature.entity.ts`
- `SubscriptionPlan` (system) — `modules/payment/entities/subscription_plan.entity.ts`

## Next layer (modules_next/) surface

- `payment/ui/CardCheckoutModal` _(ui, client)_
- `payment/ui/CreditCardForm` _(ui, client)_
- `payment/ui/CreditCardVisual` _(ui, client)_
- `payment/ui/PaymentProviderSelector` _(ui, client)_
- `payment/ui/PaymentRefundModal` _(ui, client)_
- `payment/ui/PaymentStatusBadge` _(ui, client)_
- `payment/ui/PaymentSummaryCard` _(ui, client)_
- `payment/ui/StripeExpressCheckoutModal` _(ui, client)_
- `payment/ui/WalletBadges` _(ui, client)_

## README

# Payment Module

A multi-provider payment gateway supporting **Stripe, PayPal, Iyzico, Alipay, WeChat Pay, YooKassa and CloudPayments**. Each tenant collects payments through its own provider merchant account (credentials are per-tenant Settings); inbound webhook signatures are verified with platform-level (root-tenant) credentials. Full TypeScript + Zod validation throughout.

---

## Entities

All four entities can live in the **tenant DB** (writes go through `tenantDataSourceFor(tenantId)` when a `tenantId` is present; otherwise the default system data source).

| Entity | Table | Description |
|---|---|---|
| `Payment` | `payments` | A payment record (amount, currency, provider, status, customer/billing info, refund + failure fields). Soft-deleted via `deletedAt`. |
| `PaymentTransaction` | `payment_transactions` | Individual ledger entries against a payment — `PAYMENT` / `REFUND` / `CHARGEBACK` / `PAYOUT`, with fee/net, provider response, and parent linkage. |
| `SubscriptionPlan` | `subscription_plans` | A billing plan for a tenant product (`interval`, `trialDays`, `status`). |
| `PlanFeature` | `plan_features` | Feature flags/limits attached to a plan (`key`, `label`, `type`, `value`, `sortOrder`). Unique per `(tenantId, planId, key)`. |

---

## Services / Responsibilities

| Service | Responsibility |
|---|---|
| `PaymentService` (`payment.service.ts`) | Core service. CRUD for payments + transactions, list/query, refunds, mark completed/failed/cancelled, provider routing, and the provider-agnostic gateway calls: `createCheckoutSession`, `chargeWithCard` / `start3dsCharge` / `complete3dsCharge`, `createPaymentIntent`, `checkBin`, `createCustomerPortalSession`, plus wallet introspection (`getSupportedWallets`, `getWalletMatrix`) and provider discovery (`getAvailableProviders`, `getDefaultProvider`). Single-record reads are Redis-cached. |
| `PaymentWebhookService` (`payment.webhook.service.ts`) | Inbound provider webhook handling. Verifies signatures (`verifyStripeSignature`, `verifyPaypalSignature`) using **root-tenant** credentials, normalizes Stripe/PayPal events and the Iyzico hosted-form callback into internal actions, then dispatches: marks payments completed/failed/expired/refunded, renews/cancels/past-dues subscriptions, issues renewal invoices, writes audit logs, fans out a dunning email to active tenant ADMINs, and re-dispatches `payment.*` events to outgoing webhooks via `WebhookService`.  Split across `payment.webhook.{service,stripe.service,paypal.service,handlers.service,notifications.service}.ts` (entry stays `PaymentWebhookService`). |
| `PaymentProrationService` (`payment.proration.service.ts`) | Mid-period plan-change proration arithmetic. `calculateProration()` computes credit/charge/net for a switch; `prorationLines()` turns the result into `InvoiceLine`-shaped inputs (`sourceType: 'proration'`). |
| Providers (`providers/*.provider.ts`) | One singleton per gateway extending `BasePaymentProvider`. Each reads its own API credentials per-tenant via `SettingService.getValue(tenantId, …)` and implements checkout sessions, status lookups, and (where supported) direct/3DS card charges, BIN lookup, customer portal, payment intents, and a `supportedWallets` descriptor. |

---

## Providers

| Provider | Region | Auth | Token format | Notes |
|---|---|---|---|---|
| Stripe | Global | Bearer secret key | Payment Intent / Checkout Session id | Supports Express Checkout (client Element) + billing portal. |
| PayPal | Global | OAuth 2.0 (client id/secret) | Order id | Sandbox vs live via `paypalSandboxMode`. |
| Iyzico | Turkey | HMAC-SHA256 (IYZWSv2) | Checkout form token | Only provider implementing **direct + 3DS card charge** and BIN check today. |
| Alipay | China | RSA2 (SHA256-with-RSA) | Merchant `out_trade_no` | `createCheckoutSession` returns a signed `alipay.trade.page.pay` URL. |
| WeChat Pay | China | API v3, SHA256-RSA2048 | Merchant `out_trade_no` | Native flow returns a `code_url` for QR rendering. Only `CNY` supported. |
| YooKassa | Russia | HTTP Basic (`shopId:secretKey`) | YooKassa `payment.id` (UUID) | `POST /v3/payments` with `Idempotence-Key`; redirect to `confirmation_url`. |
| CloudPayments | Russia | HTTP Basic (`publicId:apiSecret`) | `InvoiceId` | `POST /orders/create` returns `Model.Url` for redirect. |

### Regional coverage

| Region | Providers |
|--------|-----------|
| Global | Stripe, PayPal |
| Turkey | Iyzico |
| China | Alipay (支付宝), WeChat Pay (微信支付) |
| Russia | YooKassa, CloudPayments |

### Provider base URLs

| Provider | Sandbox URL | Production URL |
|----------|-------------|----------------|
| Stripe | https://api.stripe.com/v1 | https://api.stripe.com/v1 |
| PayPal | https://api-m.sandbox.paypal.com | https://api-m.paypal.com |
| Iyzico | https://sandbox-api.iyzipay.com | https://api.iyzipay.com |
| Alipay | https://openapi.alipaydev.com/gateway.do | https://openapi.alipay.com/gateway.do |
| WeChat Pay | https://api.mch.weixin.qq.com | https://api.mch.weixin.qq.com |
| YooKassa | https://api.yookassa.ru/v3 (test shop) | https://api.yookassa.ru/v3 |
| CloudPayments | https://api.cloudpayments.ru (test keys) | https://api.cloudpayments.ru |

---

## API Routes

All HTTP routes are **tenant-scoped** under `/tenant/[tenantId]/api/payments` (tenant admin). The inbound provider-webhook entry points (`PaymentWebhookService.handleStripeEvent` / `handlePaypalEvent` / `handleIyzicoCallback`) are exposed as service methods; they verify against **root-tenant** credentials.

| Method | Path | Description |
|---|---|---|
| GET | `/tenant/[id]/api/payments` | List payments (filterable). |
| POST | `/tenant/[id]/api/payments` | Create a payment. |
| GET / PUT / DELETE | `/tenant/[id]/api/payments/[paymentId]` | Get / update / delete (soft) a payment. |
| POST | `/tenant/[id]/api/payments/[paymentId]/refund` | Refund (full or partial). |
| GET | `/tenant/[id]/api/payments/[paymentId]/transactions` | List a payment's transactions. |
| GET / PUT | `/tenant/[id]/api/payments/transactions/[transactionId]` | Get / update a transaction. |
| GET | `/tenant/[id]/api/payments/providers` | List available providers. |
| GET | `/tenant/[id]/api/payments/wallets` | Wallet capability matrix (`getWalletMatrix`). |
| POST | `/tenant/[id]/api/payments/provider-status` | Query provider status for a token. |
| POST | `/tenant/[id]/api/payments/bin-check` | Combined `CardBinInfo` for `{ bin, provider? }`. |
| POST / GET | `/tenant/[id]/api/subscription/payment-intent` (+ `/confirm`) | Stripe Express Checkout intent for the subscription flow. |

---

## Usage

### Provider status, providers, validation

```typescript
import { PaymentService, GetProviderStatusRequestSchema } from '@/modules/payment'

// Query provider-side status for a token (tenant-scoped credentials are used)
const status = await PaymentService.getProviderStatus({
  tenantId,
  token: 'pi_1234567890',
  provider: 'STRIPE',          // optional — defaults to PAYMENT_DEFAULT_PROVIDER
})

PaymentService.getAvailableProviders() // ['STRIPE','PAYPAL','IYZICO','ALIPAY','WECHATPAY','YOOKASSA','CLOUDPAYMENTS']
PaymentService.getDefaultProvider()    // 'STRIPE' (or env PAYMENT_DEFAULT_PROVIDER)

// Validate request data
const parsed = GetProviderStatusRequestSchema.safeParse({ tenantId, token, provider: 'STRIPE' })
```

### Checkout session (hosted redirect)

```typescript
const session = await PaymentService.createCheckoutSession(tenantId, {
  amount: 49.0, currency: 'USD', description: 'Pro plan',
  successUrl, cancelUrl, metadata: { tenantId },
}, 'STRIPE')
// → { sessionId, checkoutUrl, providerData? }
```

## Direct Card Charging & BIN Check

Besides the hosted-redirect flow (`createCheckoutSession`), the module supports
charging a **raw card collected on our own form** (non-3DS). This is a shared,
provider-agnostic capability on `BasePaymentProvider`; providers opt in by
overriding it. **Iyzico** implements it today (via `/payment/auth`); other
providers fall back to the hosted redirect.

```typescript
import { PaymentService } from '@/modules/payment'

// Is direct (own-form) charging available for this provider?
PaymentService.supportsDirectCardPayment('IYZICO') // true

// Combined BIN check: provider BIN lookup (brand/bank/type/commercial) +
// public BIN→country lookup (binlist). Drives the "charge Turkish cards in TRY".
const bin = await PaymentService.checkBin(tenantId, '979211', 'IYZICO')
// → { bin, brand: 'TROY', bankName, cardType, commercial, country: 'TR', isTurkish: true, force3ds }

// Charge a raw card directly (PCI-sensitive — never persisted/logged).
const result = await PaymentService.chargeWithCard(tenantId, {
  amount: 935.45, currency: 'TRY', description: 'Pro Subscription',
  card: { cardHolderName, cardNumber, expireMonth: '12', expireYear: '30', cvc: '123' },
  basketItems: [{ id: planId, name: 'Pro', price: 935.45 }],
}, 'IYZICO')
// → { status: 'success' | 'failure', providerPaymentId?, errorCode?, errorMessage? }
```

A card counts as **Turkish** when the BIN→country is `TR` **or** the provider's BIN
lookup returned a (Turkish) bank. The subscription flow uses this to convert a
USD-priced plan to TRY at the live [TCMB rate](../exchange_rate/README.md) before
charging — see [`tenant_subscription`](../tenant_subscription/README.md)
(`quote` / `payWithCard`). The shared card form lives at
`modules_next/payment/ui/CreditCardForm.tsx`.

### 3D Secure

Same shared interface, two extra methods (Iyzico implements them):

```typescript
PaymentService.supports3dsCardPayment('IYZICO') // true

// 1) Start: returns base64 self-submitting HTML for the bank's 3DS page.
const init = await PaymentService.start3dsCharge(tenantId, {
  ...directChargeParams, callbackUrl, // where the bank returns
}, 'IYZICO')
// → { status, htmlContent, conversationId }  (render htmlContent: full-page redirect or popup)

// 2) Finalize on the bank callback (re-validates with the provider — cannot be forged).
const done = await PaymentService.complete3dsCharge(tenantId, { conversationId, paymentId }, 'IYZICO')
// → { status: 'success' | 'failure', providerPaymentId? }
```

The subscription flow decides 3DS **automatically**: commercial cards (`force3ds`)
and Turkish cards go through 3DS; everything else is charged non-3DS in one step.
The UI uses a full-page redirect (renders `htmlContent` via `document.write`); the
bank returns to a public callback route that finalizes + activates the subscription.

### BIN-check route

`POST /tenant/[tenantId]/api/payments/bin-check` → `{ bin, provider? }` → combined `CardBinInfo`.

## Wallets & Alternative Payment Methods

Wallets are **provider-specific** and exposed through a generic capability:
`provider.supportedWallets` declares which wallets it can surface and **how** each is
delivered. `MasterPass`/`Visa Checkout` merged into **Click to Pay** (EMVCo SRC)
globally; `MASTERPASS` remains a live local scheme in Turkey via iyzico hosted.

```typescript
PaymentService.getSupportedWallets('IYZICO') // [{method:'MASTERPASS',delivery:'HOSTED_REDIRECT'}, …]
PaymentService.getWalletMatrix()             // every provider → its wallets (UI: GET .../api/payments/wallets)
```

Delivery types (`WalletDeliveryEnum`):
- **HOSTED_REDIRECT** — appears on the provider's hosted page; no extra code (enable in the provider panel).
- **CLIENT_ELEMENT** — browser SDK/Element (Stripe Express Checkout via `PaymentService.createPaymentIntent`).
- **DIRECT_API** — server wallet protocol (e.g. iyzico MasterPass MSISDN/OTP — not implemented).

| Provider | Wallets (delivery) |
|---|---|
| **iyzico** | MasterPass, BKM Express, Saved card, Installments — *hosted redirect* |
| **Stripe** | Apple Pay, Google Pay, **Click to Pay**, Link, PayPal, Amazon Pay, Cash App — *client element* (Express Checkout) |
| PayPal | PayPal — *hosted redirect* |
| Alipay / WeChat | Alipay / WeChat Pay — *hosted redirect* |
| YooKassa / CloudPayments | YooMoney / SBP — *hosted redirect* |

**Stripe Express Checkout (client element):** `createPaymentIntent` returns
`{ clientSecret, publishableKey, providerRef }` for `<ExpressCheckoutElement>`
(`modules_next/payment/ui/StripeExpressCheckoutModal.tsx`). The subscription flow
wraps this in `startExpressCheckout` / `confirmExpressCheckout` (server-side verifies
the PaymentIntent succeeded before activating). Apple Pay needs Stripe domain
verification; set `stripePublishableKey` in settings.

---

## Webhooks

`PaymentWebhookService` verifies inbound provider webhooks with **root-tenant**
(`ROOT_TENANT_ID`) credentials, normalizes them to internal actions, and dispatches:

| Internal action | Effect |
|---|---|
| `payment.completed` | `TenantSubscriptionService.confirmPayment`, audit log, re-dispatch `payment.completed` outgoing webhook. |
| `payment.failed` | `PaymentService.markAsFailed`, audit, re-dispatch `payment.failed`. |
| `payment.expired` | Set payment status `EXPIRED`, audit. |
| `payment.refunded` | `PaymentService.refund` (or status `REFUNDED`), audit, re-dispatch `payment.refunded`. |
| `subscription.renewed` | Extend the period (branch on `billingInterval`), issue a renewal invoice (best-effort), audit. |
| `subscription.cancelled` | `TenantSubscriptionService.cancelSubscription`, audit. |
| `subscription.past_due` | Set `PAST_DUE`, start grace period, send dunning email to active tenant ADMINs, audit. |

- **Stripe**: `verifyStripeSignature` (HMAC-SHA256 over `<timestamp>.<rawBody>`); reads `stripeWebhookSecret` at root.
- **PayPal**: `verifyPaypalSignature` calls PayPal's verify-webhook-signature API using `paypalClientId/Secret`, `paypalWebhookId`, `paypalSandboxMode` at root.
- **Iyzico**: `handleIyzicoCallback` re-verifies the hosted-form token against Iyzico (`iyzicoApiKey/SecretKey/SandboxMode` at root).

Writes go through `PaymentService` so cache invalidation is inherited (see *Caching*).

---

## Caching

Single-record lookups are cached in Redis (TTL = `TENANT_CACHE_TTL`, default 5 min):

| Key | Returns | Used by |
|---|---|---|
| `payment:id:{paymentId}` | `SafePayment` | `getById` |
| `payment:tx:{paymentId}` | `PaymentWithTransactions` | `getByIdWithTransactions` |
| `payment_tx:id:{transactionId}` | `PaymentTransaction` | `getTransactionById` |
| `bin:country:{bin}` | BIN→country lookup | `checkBin` (7-day TTL) |

List queries (`getAll`, `getTransactions`, `getPaymentsByUser`, `getPaymentsByTenant`) are **not** cached — too many filter combinations and they're usually requested fresh from admin UIs.

Invalidation map:

| Mutation | Clears |
|---|---|
| `update`, `markAsCompleted/Failed/Cancelled` | `payment:id:` + `payment:tx:` |
| `delete` (soft) | `payment:id:` + `payment:tx:` |
| `refund` | `payment:id:` + `payment:tx:` |
| `createTransaction` | `payment:tx:` (parent payment's transactions list changed) |
| `updateTransaction` | `payment_tx:id:` + `payment:tx:` (parent) |

Webhook flow (`payment.webhook.service.ts`) writes through `PaymentService.update` / `markAsFailed` / etc., so webhooks inherit cache invalidation for free.

TTL is jittered ±10% and reads are wrapped in in-process single-flight — useful on payment-status polling where many client requests may hit the same `paymentId` simultaneously.

---

## Types & Schemas

### Enums (`payment.enums.ts`)

```typescript
import {
  PaymentProviderEnum,    // ['STRIPE','PAYPAL','IYZICO','ALIPAY','WECHATPAY','YOOKASSA','CLOUDPAYMENTS']
  PaymentStatusEnum,      // PENDING|PROCESSING|COMPLETED|FAILED|REFUNDED|PARTIALLY_REFUNDED|CANCELLED|EXPIRED
  PaymentMethodEnum,      // CREDIT_CARD|DEBIT_CARD|BANK_TRANSFER|PAYPAL|APPLE_PAY|GOOGLE_PAY|OTHER
  TransactionTypeEnum,    // PAYMENT|REFUND|CHARGEBACK|PAYOUT
  TransactionStatusEnum,  // PENDING|PROCESSING|COMPLETED|FAILED|CANCELLED
  PaymentCurrencyEnum,    // 180+ ISO 4217 codes via currency-codes-ts
  CardBrandEnum,          // VISA|MASTERCARD|AMEX|DISCOVER|TROY|MIR|UNIONPAY|JCB|UNKNOWN
  WalletMethodEnum, WalletDeliveryEnum,
} from '@/modules/payment'
```

Currency utilities are re-exported: `getCurrencyByCode`, `getCurrencyByCountry`, `getAllCurrencyCodes`, and the `CurrencyCode` / `CurrencyCodeRecord` types.

```typescript
import { getCurrencyByCode } from '@/modules/payment'
getCurrencyByCode('USD') // { code:'USD', number:'840', digits:2, currency:'US Dollar', countries:[...] }
```

### DTOs (`payment.dto.ts`)

`CreatePaymentRequestSchema`, `UpdatePaymentRequestSchema`, `GetPaymentByIdRequestSchema`,
`GetPaymentsQuerySchema`, `GetProviderStatusRequestSchema`, `CreateTransactionRequestSchema`,
`UpdateTransactionRequestSchema`, `GetTransactionByIdRequestSchema`, `GetTransactionsQuerySchema`,
`RefundPaymentRequestSchema` (+ inferred `*DTO` types).

---

## Error Handling

All error messages are centralized in `payment.messages.ts` (`PAYMENT_MESSAGES`), e.g.
`PROVIDER_NOT_FOUND`, `PROVIDER_NOT_CONFIGURED`, `PAYMENT_NOT_FOUND`, `REFUND_NOT_ALLOWED`,
`REFUND_AMOUNT_EXCEEDS_PAYMENT`, `DIRECT_PAYMENT_NOT_SUPPORTED`, plus per-provider and
webhook-verification messages (`STRIPE_WEBHOOK_VERIFICATION_FAILED`, `IYZICO_CALLBACK_VERIFICATION_FAILED`, …).

```typescript
import { PaymentService, PAYMENT_MESSAGES } from '@/modules/payment'

try {
  await PaymentService.chargeWithCard(tenantId, params, 'STRIPE')
} catch (error) {
  if (error.message === PAYMENT_MESSAGES.DIRECT_PAYMENT_NOT_SUPPORTED) {
    // fall back to hosted redirect
  }
}
```

---

## Settings

Provider credentials are stored as **Settings** (DB-backed, via `SettingService`) — not env vars.
The only env var is the global default provider:

```env
# STRIPE | PAYPAL | IYZICO | ALIPAY | WECHATPAY | YOOKASSA | CLOUDPAYMENTS
PAYMENT_DEFAULT_PROVIDER=STRIPE
```

Setting keys are declared in [`payment.setting.keys.ts`](./payment.setting.keys.ts) and surfaced
in the admin UI at `/tenant/[tenantId]/admin/payments/settings`.

**System Payment keys** (`PaymentSettingKeySchema` / `PAYMENT_KEYS`):

| Provider | Setting Keys |
|----------|--------------|
| Stripe | `stripeEnabled`, `stripePublicKey`, `stripeSecretKey`, `stripePublishableKey`, `stripeWebhookSecret` |
| PayPal | `paypalEnabled`, `paypalClientId`, `paypalClientSecret`, `paypalSandboxMode`, `paypalWebhookId` |
| Iyzico | `iyzicoEnabled`, `iyzicoApiKey`, `iyzicoSecretKey`, `iyzicoSandboxMode`, `iyzicoEnabledInstallments` |
| Alipay | `alipayEnabled`, `alipayAppId`, `alipayPrivateKey`, `alipayPublicKey`, `alipaySandboxMode` |
| WeChat Pay | `wechatPayEnabled`, `wechatPayAppId`, `wechatPayMchId`, `wechatPayPrivateKey`, `wechatPaySerialNo`, `wechatPayApiV3Key`, `wechatPayNotifyUrl` |
| YooKassa | `yookassaEnabled`, `yookassaShopId`, `yookassaSecretKey` |
| CloudPayments | `cloudpaymentsEnabled`, `cloudpaymentsPublicId`, `cloudpaymentsApiSecret` |
| Misc | `currency`, `taxRate`, `taxEnabled` |

> The `*Enabled` flags, `currency`, `taxRate`, and `taxEnabled` are **declared but not read** by any
> service today (see *Candidates* in Tenant Variability). Provider availability is determined by the
> static provider map plus presence of credentials.

**Tenant Billing keys** (`TenantBillingSettingKeySchema` / `TENANT_BILLING_KEYS`):
`billingEmail`, `billingName`, `billingAddress`, `taxId`, `vatNumber`, `currency`,
`invoicePrefix`, `invoiceFooter` — declared but not read here (superseded by the
[`invoice`](../invoice/README.md) module's settings).

---

## Security

- **Card data is PCI-sensitive**: raw card details (`DirectChargeCard`) are passed straight to the
  provider and **never persisted or logged**. The shared card form lives at
  `modules_next/payment/ui/CreditCardForm.tsx`.
- **Webhook signatures** are verified before any state change — Stripe HMAC (`crypto.timingSafeEqual`),
  PayPal verify-webhook-signature API, and an Iyzico callback re-verification — all against
  **root-tenant** credentials.
- **3DS finalization** (`complete3dsPayment`) re-validates with the provider on the bank callback, so a
  forged callback cannot mark a payment successful.
- **BIN→country** uses a best-effort public lookup (binlist.net) that degrades to `null` on failure and
  never blocks checkout.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A multi-provider payment gateway (Stripe, PayPal, Iyzico, Alipay, WeChat Pay, YooKassa, CloudPayments) where each tenant collects payments through its own provider merchant account by supplying provider API credentials as per-tenant Settings, while webhook signature verification is done with platform-level (ROOT_TENANT_ID) credentials.

### Per-tenant settings

| Key | Type | Default | Scope | Controls | Read in |
|---|---|---|---|---|---|
| `stripeSecretKey` | string | — | tenant | Stripe API secret key used to authenticate every outbound Stripe call (checkout sessions, payment intents, billing portal) for the tenant. | `stripe.provider.ts` |
| `stripePublishableKey` | string | — | tenant | Stripe publishable key returned to the client for the Express Checkout Element (Apple/Google Pay, Click to Pay, Link, PayPal). | `stripe.provider.ts` |
| `stripeCustomerId` | string | — | tenant | Cached Stripe customer id for the tenant; resolved/created when opening the Stripe billing portal. | `stripe.provider.ts` |
| `paypalClientId` | string | — | tenant | PayPal REST client id used to obtain the tenant's OAuth access token for checkout orders. | `paypal.provider.ts` |
| `paypalClientSecret` | string | — | tenant | PayPal REST client secret paired with paypalClientId for the tenant's OAuth token. | `paypal.provider.ts` |
| `paypalSandboxMode` | boolean | — | tenant | Switches the tenant's PayPal calls between sandbox and live API base URLs. | `paypal.provider.ts` |
| `iyzicoApiKey` | string | — | tenant | Iyzico API key used to sign the tenant's checkout/3DS/BIN requests. | `iyzico.provider.ts` |
| `iyzicoSecretKey` | string | — | tenant | Iyzico secret key used in the HMAC authorization signature for the tenant. | `iyzico.provider.ts` |
| `iyzicoSandboxMode` | boolean | — | tenant | Switches the tenant's Iyzico calls between sandbox and live API base URLs. | `iyzico.provider.ts` |
| `iyzicoEnabledInstallments` | string | — | tenant | Comma-separated installment counts (e.g. 1,2,3,6,9) scoped onto the tenant's hosted Iyzico checkout form. | `iyzico.provider.ts` |
| `alipayAppId` | string | — | tenant | Alipay application id for the tenant's Alipay gateway calls. | `alipay.provider.ts` |
| `alipayPrivateKey` | text | — | tenant | Alipay RSA private key used to sign the tenant's requests. | `alipay.provider.ts` |
| `alipayPublicKey` | text | — | tenant | Alipay public key used to verify Alipay responses for the tenant. | `alipay.provider.ts` |
| `alipaySandboxMode` | boolean | — | tenant | Switches the tenant's Alipay calls between the dev and live gateway. | `alipay.provider.ts` |
| `wechatPayAppId` | string | — | tenant | WeChat Pay application id for the tenant. | `wechatpay.provider.ts` |
| `wechatPayMchId` | string | — | tenant | WeChat Pay merchant id for the tenant. | `wechatpay.provider.ts` |
| `wechatPayPrivateKey` | text | — | tenant | WeChat Pay merchant private key used to sign the tenant's API requests. | `wechatpay.provider.ts` |
| `wechatPaySerialNo` | string | — | tenant | WeChat Pay certificate serial number for the tenant's signing key. | `wechatpay.provider.ts` |
| `wechatPayApiV3Key` | string | — | tenant | WeChat Pay APIv3 key used to decrypt callbacks/resources for the tenant. | `wechatpay.provider.ts` |
| `wechatPayNotifyUrl` | string | — | tenant | WeChat Pay notify (callback) URL configured per tenant. | `wechatpay.provider.ts` |
| `yookassaShopId` | string | — | tenant | YooKassa shop id used as the basic-auth username for the tenant's calls. | `yookassa.provider.ts` |
| `yookassaSecretKey` | string | — | tenant | YooKassa secret key used as the basic-auth password for the tenant's calls. | `yookassa.provider.ts` |
| `cloudpaymentsPublicId` | string | — | tenant | CloudPayments public id used as the basic-auth username for the tenant's calls. | `cloudpayments.provider.ts` |
| `cloudpaymentsApiSecret` | string | — | tenant | CloudPayments API secret used as the basic-auth password for the tenant's calls. | `cloudpayments.provider.ts` |

*Scope: `tenant` = real tenants override · `root` = platform-only default (not per-tenant).*

### Per-tenant behavior

- `stripe.provider.ts / paypal.provider.ts / iyzico.provider.ts / alipay.provider.ts / wechatpay.provider.ts / yookassa.provider.ts / cloudpayments.provider.ts` — Every provider's getConfig/getSecretKey/getAccessToken reads its API credentials via SettingService.getValue(tenantId, ...), so each tenant's checkout/charge/portal/BIN calls are authenticated against that tenant's own merchant account; sandbox-vs-live base URL also varies per tenant via the *SandboxMode keys. A tenant with no credentials throws PROVIDER_NOT_CONFIGURED.
- `iyzico.provider.ts:createCheckoutSession` — The hosted checkout form's offered installment counts vary per tenant from the iyzicoEnabledInstallments setting.
- `payment.service.ts:createCheckoutSession / chargeWithCard / start3dsCharge / createPaymentIntent / checkBin` — All entry points take tenantId and forward it to the provider so the tenant-scoped credentials above are used; provider capability gating (supportsDirectCardPayment, supports3dsCardPayment, supportedWallets) is per-provider, not per-tenant.
- `payment.webhook.handlers.service.ts:onSubscriptionRenewed` / `payment.webhook.notifications.service.ts:issueRenewalInvoice` — Renewal invoice currency falls back to the tenant's invoiceDefaultCurrency setting and renewal period length branches on the tenant subscription's billingInterval (MONTHLY vs yearly).
- `payment.webhook.notifications.service.ts:sendDunningEmail` — Past-due dunning emails are fanned out to the active ADMIN members of the specific tenant (tenantDataSourceFor(tenantId)), so recipients and grace-period retry date are per tenant.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| taxRate / taxEnabled setting keys declared in the System Payment Setting Keys section but never read anywhere in the codebase. | `payment.setting.keys.ts (PaymentSettingKeySchema)` | A tenant's applicable VAT/sales-tax rate and whether tax is charged is inherently per-tenant (jurisdiction-dependent), yet no service reads these; actual tax handling lives in the separate payment_tax/invoice modules. Either wire them per-tenant or remove them. | `taxRate` |
| currency setting key (the payment module's default settlement currency) declared but never read. | `payment.setting.keys.ts (PaymentSettingKeySchema / TenantBillingSettingKeySchema)` | Currency is passed explicitly into every payment DTO today; a tenant-level default currency would let each tenant pick its settlement currency without supplying it on each call. | `currency` |
| Default payment provider is a single global value from env (PAYMENT_DEFAULT_PROVIDER, falling back to STRIPE); there is no per-tenant default-provider setting. | `payment.service.ts (DEFAULT_PROVIDER / getProvider)` | Different tenants operate in different regions (Iyzico for TR, YooKassa/CloudPayments for RU, Alipay/WeChat for CN) and will want different default gateways; today the default cannot be set per tenant and must be passed explicitly on every call to deviate from the env default. | `defaultPaymentProvider` |
| Per-provider enable flags (stripeEnabled, paypalEnabled, iyzicoEnabled, alipayEnabled, wechatPayEnabled, yookassaEnabled, cloudpaymentsEnabled) are declared but never read; provider availability is determined solely by the static PROVIDERS map and presence of credentials. | `payment.setting.keys.ts (PaymentSettingKeySchema); payment.service.ts (getAvailableProviders)` | A tenant should be able to enable/disable specific gateways it offers at checkout; getAvailableProviders() returns all registered providers globally regardless of these flags. | `stripeEnabled` |
| All TenantBilling setting keys (billingEmail, billingName, billingAddress, taxId, vatNumber, invoicePrefix, invoiceFooter) are declared but not read anywhere. | `payment.setting.keys.ts (TenantBillingSettingKeySchema)` | These are clearly intended per-tenant billing identity/invoice-formatting values; they appear to be superseded by the invoice module's own settings and are currently dead keys that should be wired per tenant or removed. | `billingEmail` |
| binlist.net BIN-to-country lookup is a hardcoded global HTTP call with a fixed 7-day cache and 5s timeout, shared across all tenants. | `payment.service.ts (lookupBinCountry / BIN_CACHE_TTL)` | Intentionally global shared infrastructure (a public static BIN→country dataset), so this is fine to leave global; noted only for completeness — not a real per-tenant gap. | — |

### Platform/root-only settings (not per-tenant)

Configured once at the root tenant; identical for all tenants:

- `stripeWebhookSecret` — Stripe webhook signing secret read at ROOT_TENANT_ID to verify inbound Stripe webhook signatures (platform-level).
- `paypalWebhookId` — PayPal webhook id read at ROOT_TENANT_ID to verify inbound PayPal webhook signatures (platform-level).
- `paypalClientId` — Read at ROOT_TENANT_ID in the webhook service to mint the OAuth token used to call PayPal's verify-webhook-signature endpoint (platform path, distinct from the per-tenant checkout read).
- `paypalClientSecret` — Read at ROOT_TENANT_ID in the webhook service for PayPal webhook-verification OAuth (platform path).
- `paypalSandboxMode` — Read at ROOT_TENANT_ID in the webhook service to choose the PayPal verify API base URL (platform path).
- `iyzicoApiKey` — Read at ROOT_TENANT_ID in handleIyzicoCallback to verify the hosted-form callback (platform path, distinct from per-tenant checkout read).
- `iyzicoSecretKey` — Read at ROOT_TENANT_ID in handleIyzicoCallback to sign the callback-verification request (platform path).
- `iyzicoSandboxMode` — Read at ROOT_TENANT_ID in handleIyzicoCallback to choose the Iyzico API base URL (platform path).

---

## Module Structure

```
modules/payment/
├── index.ts                      # Module exports
├── payment.service.ts            # Core service
├── payment.webhook.service.ts    # Inbound webhook entry (Iyzico + Stripe/PayPal delegators)
├── payment.webhook.stripe.service.ts   # Stripe verify/normalize/handle
├── payment.webhook.paypal.service.ts   # PayPal verify/normalize/handle
├── payment.webhook.handlers.service.ts # Dispatcher + action handlers (payment/subscription)
├── payment.webhook.notifications.service.ts # Renewal invoice + dunning email
├── payment.webhook.types.ts      # Shared webhook event/normalized types
├── payment.proration.service.ts  # Mid-period proration arithmetic
├── payment.dto.ts                # Zod DTOs
├── payment.enums.ts              # Enums + currency utilities
├── payment.types.ts              # Safe types / schemas
├── payment.messages.ts           # Centralized error messages
├── payment.setting.keys.ts       # Setting key schemas (PAYMENT_KEYS, TENANT_BILLING_KEYS)
├── payment.seed.ts               # Demo seed
├── entities/
│   ├── payment.entity.ts             # payments
│   ├── payment_transaction.entity.ts # payment_transactions
│   ├── subscription_plan.entity.ts   # subscription_plans
│   └── plan_feature.entity.ts        # plan_features
└── providers/
    ├── base.provider.ts          # Abstract base provider
    ├── stripe.provider.ts        # Stripe
    ├── paypal.provider.ts        # PayPal
    ├── iyzico.provider.ts        # Iyzico (Turkey)
    ├── alipay.provider.ts        # Alipay (China)
    ├── wechatpay.provider.ts     # WeChat Pay (China)
    ├── yookassa.provider.ts      # YooKassa (Russia)
    └── cloudpayments.provider.ts # CloudPayments (Russia)
```

---

## Dependencies

Requires: `db`, `env`, `setting`, `common`. Integrates with `tenant_subscription`
(payment confirmation, renewals, cancellation), `invoice` (renewal invoices),
`webhook` (re-dispatch of `payment.*` events), `notification_mail` (dunning),
`audit_log`, `redis` (caching), and `exchange_rate` (USD→TRY for the card flow).

## Adding a New Provider

1. Create `providers/<name>.provider.ts` extending `BasePaymentProvider`; read credentials via `SettingService.getValue(tenantId, …)`.
2. Add the provider to `PaymentProviderEnum` in `payment.enums.ts` and any error messages to `payment.messages.ts`.
3. Register the singleton in `PaymentService.PROVIDERS` (`payment.service.ts`).
4. Add its setting keys to `payment.setting.keys.ts`.
