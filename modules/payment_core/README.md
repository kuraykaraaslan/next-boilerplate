# Payment Core Module

Provider abstraction library for payments. It defines a common `BasePaymentProvider` interface and ships seven concrete provider implementations (Stripe, PayPal, Iyzico, Alipay, WeChat Pay, YooKassa, CloudPayments) plus the shared enums, types, messages, and setting-key schema that the higher-level payment modules build on. This module owns **no** entities, services, routes, or jobs of its own — it is a pure library consumed by `payment`, `payment_sell`, `payment_subscription`, and related modules.

---

## Contents

| File | Description |
|---|---|
| `payment_core.enums.ts` | Zod enums: `PaymentProviderEnum`, `PaymentMethodEnum`, `PaymentCurrencyEnum` (all ISO codes via `currency-codes-ts`), `WebhookEventTypeEnum`; plus currency lookup re-exports. |
| `payment_core.types.ts` | Shared interfaces/schemas: `BillingAddressSchema`, `ProviderResultSchema`, `NormalizedWebhookEvent`, `ProviderCapabilities`, `WebhookHandler`. |
| `payment_core.messages.ts` | `PAYMENT_MESSAGES` — centralized error/status strings (generic + per-provider + webhook). |
| `payment_core.setting.keys.ts` | `PaymentProviderSettingKeySchema` enum and `PAYMENT_CORE_KEYS` — the full list of provider credential/toggle setting keys. |
| `providers/base.provider.ts` | `BasePaymentProvider` abstract class and the `CheckoutSession*` / `CustomerPortal*` param/result interfaces. |
| `providers/*.provider.ts` | Seven concrete provider singletons (see below). |

This module has **no** `entities/`, `*.service.ts`, `*.settings.fields.ts`, or `*.job.ts` files. The `Payment` entity (`payments` table) and the orchestrating `PaymentService` live in the sibling **`payment`** module.

---

## Providers

All providers extend `BasePaymentProvider` and are used as **singletons**, so tenant context never lives on the instance — every payment-relevant method takes `tenantId` as its first argument and reads tenant-scoped credentials from `SettingService.getValue(tenantId, ...)` per call.

| Provider | `name` | Credentials read per tenant | Notes |
|---|---|---|---|
| `StripeProvider` | `stripe` | `stripeSecretKey` (+ cached `stripeCustomerId`) | Only provider with a hosted customer portal (`createCustomerPortalSession`). |
| `PaypalProvider` | `paypal` | `paypalClientId`, `paypalClientSecret`, `paypalSandboxMode` | OAuth token cached per `tenantId` in a static `TOKEN_CACHE`. |
| `IyzicoProvider` | `iyzico` | `iyzicoApiKey`, `iyzicoSecretKey`, `iyzicoSandboxMode` | HMAC-SHA256 `IYZWSv2` request signing. |
| `AlipayProvider` | `alipay` | `alipayAppId`, `alipayPrivateKey`, `alipayPublicKey`, `alipaySandboxMode` | RSA2 signed gateway URLs. |
| `WeChatPayProvider` | `wechatpay` | `wechatPayAppId`, `wechatPayMchId`, `wechatPayPrivateKey`, `wechatPaySerialNo`, `wechatPayApiV3Key`, `wechatPayNotifyUrl` | `WECHATPAY2-SHA256-RSA2048` auth header; native (QR) checkout. |
| `YooKassaProvider` | `yookassa` | `yookassaShopId`, `yookassaSecretKey` | HTTP Basic auth; `Idempotence-Key` on create. |
| `CloudPaymentsProvider` | `cloudpayments` | `cloudpaymentsPublicId`, `cloudpaymentsApiSecret` | HTTP Basic auth; hosted order URL. |

### `BasePaymentProvider` interface

| Member | Description |
|---|---|
| `name` | Provider identifier string. |
| `getAxiosInstance()` | Low-level, **unauthenticated** client (health-check fallback only; not tenant-scoped). |
| `getPaymentStatus(tenantId, token)` | Resolve provider-side payment/order status. |
| `createCheckoutSession(tenantId, params)` | Create a checkout/order and return `{ sessionId, checkoutUrl, providerData? }`. |
| `createCustomerPortalSession(tenantId, params)` | Self-service billing portal URL. Default returns `{ url: null, note }`; only `StripeProvider` overrides it. |

---

## Settings

This module defines the **schema** of provider setting keys in `payment_core.setting.keys.ts` (`PaymentProviderSettingKeySchema` / `PAYMENT_CORE_KEYS`); the providers read them at request time. Two kinds:

- **Per-tenant credentials** — each tenant brings its own merchant keys (secret/public keys, client IDs, sandbox toggles, webhook secrets). Read via `SettingService.getValue(tenantId, key)`. See the per-tenant table below.
- **Platform/root enable flags** — `stripeEnabled`, `paypalEnabled`, `iyzicoEnabled`, `alipayEnabled`, `wechatPayEnabled`, `yookassaEnabled`, `cloudpaymentsEnabled` gate which providers are offered.

If a required credential is missing, the provider throws `PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED`.

---

## Security

- Provider singletons hold **no** secrets; every secret is fetched per call from `SettingService` keyed by `tenantId`, so credentials never leak across tenants.
- PayPal access tokens are cached in a static `Map` **keyed by `tenantId`**, preventing cross-tenant token reuse.
- Iyzico (`IYZWSv2` HMAC-SHA256), Alipay (RSA2), and WeChat Pay (`WECHATPAY2-SHA256-RSA2048`) all sign requests with tenant-scoped private/secret keys.
- `getAxiosInstance()` is intentionally unauthenticated and must only be used as a low-level fallback (e.g. health checks).

---

## Usage example

```typescript
import StripeProvider from '@/modules/payment_core/providers/stripe.provider';

// Singleton; tenantId is always the first argument.
const stripe = new StripeProvider();

const session = await stripe.createCheckoutSession(tenantId, {
  amount: 49.99,
  currency: 'USD',
  description: 'Pro plan',
  successUrl: 'https://app.example.com/billing/success',
  cancelUrl: 'https://app.example.com/billing/cancel',
  metadata: { paymentId },
});
// → { sessionId, checkoutUrl, providerData }

// Stripe-only hosted billing portal:
const portal = await stripe.createCustomerPortalSession(tenantId, {
  customerEmail: 'owner@tenant.com',
  returnUrl: 'https://app.example.com/billing',
});
```

The orchestrating `PaymentService` (in the `payment` module) holds these providers in a `PROVIDERS` map and dispatches by `PaymentProviderEnum`.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Provider abstraction library implementing 7 payment providers (Stripe, PayPal, Iyzico, Alipay, WeChat Pay, YooKassa, CloudPayments); all provider singletons read tenant-scoped API credentials from SettingService per call.

### Per-tenant settings

| Key | Type | Default | Scope | Controls | Read in |
|---|---|---|---|---|---|
| `stripeSecretKey` | string | — | tenant | Tenant-specific Stripe API secret key read in StripeProvider.getSecretKey(tenantId) | `stripe.provider.ts` |
| `stripePublicKey` | string | — | tenant | Tenant-specific Stripe publishable key for client-side checkouts | `stripe.provider.ts` |
| `stripeWebhookSecret` | string | — | tenant | Tenant-specific Stripe webhook signing secret for secure webhook verification | `stripe.provider.ts` |
| `paypalClientId` | string | — | tenant | Tenant-specific PayPal OAuth client ID; read in PaypalProvider.getAccessToken(tenantId) | `paypal.provider.ts` |
| `paypalClientSecret` | string | — | tenant | Tenant-specific PayPal OAuth client secret for token generation | `paypal.provider.ts` |
| `paypalSandboxMode` | string | `false` | tenant | Boolean (string 'true'/'false') controlling whether tenant uses PayPal sandbox or production | `paypal.provider.ts` |
| `paypalWebhookId` | string | — | tenant | Tenant-specific PayPal webhook ID for receiving payment notifications | `paypal.provider.ts` |
| `iyzicoApiKey` | string | — | tenant | Tenant-specific Iyzico API key; read in IyzicoProvider.getConfig(tenantId) | `iyzico.provider.ts` |
| `iyzicoSecretKey` | string | — | tenant | Tenant-specific Iyzico secret key for request signing | `iyzico.provider.ts` |
| `iyzicoSandboxMode` | string | `false` | tenant | Boolean (string 'true'/'false') controlling whether tenant uses Iyzico sandbox or production | `iyzico.provider.ts` |
| `alipayAppId` | string | — | tenant | Tenant-specific Alipay app ID; read in AlipayProvider.getConfig(tenantId) | `alipay.provider.ts` |
| `alipayPrivateKey` | string | — | tenant | Tenant-specific Alipay RSA-2048 private key for signing requests | `alipay.provider.ts` |
| `alipayPublicKey` | string | — | tenant | Tenant-specific Alipay public key for verifying webhook signatures | `alipay.provider.ts` |
| `alipaySandboxMode` | string | `false` | tenant | Boolean (string 'true'/'false') controlling whether tenant uses Alipay sandbox or production gateway | `alipay.provider.ts` |
| `wechatPayAppId` | string | — | tenant | Tenant-specific WeChat Pay app ID; read in WeChatPayProvider.getConfig(tenantId) | `wechatpay.provider.ts` |
| `wechatPayMchId` | string | — | tenant | Tenant-specific WeChat Pay merchant ID | `wechatpay.provider.ts` |
| `wechatPayPrivateKey` | string | — | tenant | Tenant-specific WeChat Pay RSA private key for API authentication | `wechatpay.provider.ts` |
| `wechatPaySerialNo` | string | — | tenant | Tenant-specific WeChat Pay certificate serial number for request signing | `wechatpay.provider.ts` |
| `wechatPayApiV3Key` | string | — | tenant | Tenant-specific WeChat Pay API v3 key for encryption/decryption | `wechatpay.provider.ts` |
| `wechatPayNotifyUrl` | string | — | tenant | Tenant-specific WeChat Pay webhook notification URL override | `wechatpay.provider.ts` |
| `yookassaShopId` | string | — | tenant | Tenant-specific YooKassa shop ID; read in YooKassaProvider.getConfig(tenantId) | `yookassa.provider.ts` |
| `yookassaSecretKey` | string | — | tenant | Tenant-specific YooKassa API secret key for authentication | `yookassa.provider.ts` |
| `cloudpaymentsPublicId` | string | — | tenant | Tenant-specific CloudPayments public ID; read in CloudPaymentsProvider.getConfig(tenantId) | `cloudpayments.provider.ts` |
| `cloudpaymentsApiSecret` | string | — | tenant | Tenant-specific CloudPayments API secret for authentication | `cloudpayments.provider.ts` |

*Scope: `tenant` = real tenants override · `root` = platform-only default (not per-tenant).*

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `Payment` | `payments` | tenantId, provider, status, amount, currency, failureCode, failureMessage, paidAt, refundedAt |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `stripe.provider.ts:getSecretKey` — Each tenant's Stripe API secret key is read from SettingService(tenantId, 'stripeSecretKey'); different credentials per tenant enable isolated Stripe merchant accounts
- `stripe.provider.ts:createCustomerPortalSession` — Stripe customer portal login varies per tenant—resolves tenant-specific customer ID from SettingService or creates new Stripe customer with tenantId in metadata
- `paypal.provider.ts:getAccessToken` — PayPal OAuth access token is cached per tenantId; TOKEN_CACHE keyed by tenantId so each tenant reuses its own token without cross-tenant pollution
- `paypal.provider.ts:getBaseUrl` — Per-tenant paypalSandboxMode setting controls whether tenant uses PayPal sandbox (https://api-m.sandbox.paypal.com) or production (https://api-m.paypal.com)
- `iyzico.provider.ts:getConfig` — All Iyzico config (apiKey, secretKey, sandbox mode) read per tenantId; sandbox mode setting controls API gateway endpoint per tenant
- `alipay.provider.ts:getConfig` — All Alipay config (appId, privateKey, publicKey, sandbox mode) read per tenantId; sandbox setting controls Alipay gateway (dev vs production)
- `wechatpay.provider.ts:getConfig` — All WeChat Pay config (appId, mchId, privateKey, serialNo, apiV3Key, notifyUrl) read per tenantId; enables per-tenant merchant accounts
- `yookassa.provider.ts:getConfig` — YooKassa shopId and secretKey read per tenantId; enables per-tenant YooKassa merchant accounts
- `cloudpayments.provider.ts:getConfig` — CloudPayments publicId and apiSecret read per tenantId; enables per-tenant CloudPayments merchant accounts
- `payment.service.ts:createCheckoutSession` — Provider singletons delegate to tenant-scoped provider instance methods which read all credentials per tenantId—effectively every checkout session uses tenant-specific merchant keys

### Platform/root-only settings (not per-tenant)

Configured once at the root tenant; identical for all tenants:

- `stripeEnabled` — System-wide flag enabling Stripe as a payment provider option (defined in payment.setting.keys.ts)
- `paypalEnabled` — System-wide flag enabling PayPal as a payment provider option
- `iyzicoEnabled` — System-wide flag enabling Iyzico as a payment provider option
- `iyzicoEnabledInstallments` — System-wide configuration for Iyzico installment limits (Turkish iyzico MasterPass & BKM Express)
- `alipayEnabled` — System-wide flag enabling Alipay as a payment provider option (China)
- `wechatPayEnabled` — System-wide flag enabling WeChat Pay as a payment provider option (China)
- `yookassaEnabled` — System-wide flag enabling YooKassa as a payment provider option (Russia)
- `cloudpaymentsEnabled` — System-wide flag enabling CloudPayments as a payment provider option (Russia)
- `currency` — System-wide default currency for payments (defined in both payment.setting.keys.ts system section and payment_core context)
- `taxRate` — System-wide default tax rate percentage
- `taxEnabled` — System-wide flag enabling tax calculation on payments

---

## Dependencies

- **`setting`** — `SettingService` supplies all per-tenant provider credentials and toggles.
- **`payment`** — owns the `Payment` entity and `PaymentService` that orchestrates these providers.
- Consumed by **`payment_sell`** and **`payment_subscription`** for checkout, status, and webhook handling.
- External: `axios`, `crypto` / `crypto-js`, `currency-codes-ts`, `zod`.
