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

- `payment.proration.service.ts`
- `payment.service.ts`
- `payment.webhook.service.ts`

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
- `tenant` POST `/tenant/[tenantId]/api/payments/provider-status`
- `tenant` GET `/tenant/[tenantId]/api/payments/providers`
- `tenant` GET/PUT `/tenant/[tenantId]/api/payments/transactions/[transactionId]`

## TypeORM entities

- `Payment` (system) — `modules/payment/entities/payment.entity.ts`
- `PaymentTransaction` (system) — `modules/payment/entities/payment_transaction.entity.ts`
- `PlanFeature` (system) — `modules/payment/entities/plan_feature.entity.ts`
- `SubscriptionPlan` (system) — `modules/payment/entities/subscription_plan.entity.ts`

## Next layer (modules_next/) surface

- `payment/ui/PaymentStatusBadge` _(ui, client)_
- `payment/ui/PaymentSummaryCard` _(ui, client)_

## README

# Payment Module

A multi-provider payment gateway module supporting Stripe, PayPal, Iyzico, Alipay, WeChat Pay, YooKassa and CloudPayments with full TypeScript support and Zod validation.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Providers](#providers)
- [API Reference](#api-reference)
- [Types & Schemas](#types--schemas)
- [Currency Support](#currency-support)
- [Error Handling](#error-handling)
- [Adding New Providers](#adding-new-providers)

## Features

- **Multi-Provider Support**: Seamlessly switch between 7 gateways — Stripe, PayPal, Iyzico (TR), Alipay (CN), WeChat Pay (CN), YooKassa (RU), CloudPayments (RU)
- **Type Safety**: Full TypeScript support with Zod schema validation
- **ISO 4217 Currencies**: Support for 180+ currencies via `currency-codes-ts`
- **Provider Abstraction**: Unified interface across all payment providers
- **Centralized Error Messages**: All error messages defined in one place
- **Environment-Based Configuration**: Easy provider switching via environment variables

### Regional Coverage

| Region | Providers |
|--------|-----------|
| Global | Stripe, PayPal |
| Turkey | Iyzico |
| China | Alipay (支付宝), WeChat Pay (微信支付) |
| Russia | YooKassa, CloudPayments |

## Installation

The module is already included in the project. Ensure you have the required dependencies:

```bash
npm install axios crypto-js zod currency-codes-ts
```

## Configuration

### Environment Variables

```env
# Default payment provider (STRIPE | PAYPAL | IYZICO | ALIPAY | WECHATPAY | YOOKASSA | CLOUDPAYMENTS)
PAYMENT_DEFAULT_PROVIDER=STRIPE
```

All provider credentials are stored as **settings** (DB-backed, managed by `SettingService`) — not env vars. The setting keys are declared in [`payment.setting.keys.ts`](./payment.setting.keys.ts):

| Provider | Setting Keys |
|----------|--------------|
| Stripe | `stripeEnabled`, `stripePublicKey`, `stripeSecretKey`, `stripeWebhookSecret` |
| PayPal | `paypalEnabled`, `paypalClientId`, `paypalClientSecret`, `paypalSandboxMode`, `paypalWebhookId` |
| Iyzico | `iyzicoEnabled`, `iyzicoApiKey`, `iyzicoSecretKey`, `iyzicoSandboxMode` |
| Alipay | `alipayEnabled`, `alipayAppId`, `alipayPrivateKey`, `alipayPublicKey`, `alipaySandboxMode` |
| WeChat Pay | `wechatPayEnabled`, `wechatPayAppId`, `wechatPayMchId`, `wechatPayPrivateKey`, `wechatPaySerialNo`, `wechatPayApiV3Key`, `wechatPayNotifyUrl` |
| YooKassa | `yookassaEnabled`, `yookassaShopId`, `yookassaSecretKey` |
| CloudPayments | `cloudpaymentsEnabled`, `cloudpaymentsPublicId`, `cloudpaymentsApiSecret` |

### Production URLs

| Provider | Sandbox URL | Production URL |
|----------|-------------|----------------|
| Stripe | https://api.stripe.com/v1 | https://api.stripe.com/v1 |
| PayPal | https://api-m.sandbox.paypal.com | https://api-m.paypal.com |
| Iyzico | https://sandbox-api.iyzipay.com | https://api.iyzipay.com |
| Alipay | https://openapi.alipaydev.com/gateway.do | https://openapi.alipay.com/gateway.do |
| WeChat Pay | https://api.mch.weixin.qq.com | https://api.mch.weixin.qq.com |
| YooKassa | https://api.yookassa.ru/v3 (test shop) | https://api.yookassa.ru/v3 |
| CloudPayments | https://api.cloudpayments.ru (test keys) | https://api.cloudpayments.ru |

## Usage

### Basic Usage

```typescript
import { PaymentService } from '@/modules/payment'

// Get payment status using default provider
const status = await PaymentService.getPaymentStatus({
  token: 'payment_token_here'
})

// Get payment status using specific provider
const stripeStatus = await PaymentService.getPaymentStatus({
  token: 'pi_1234567890',
  provider: 'stripe'
})

const paypalStatus = await PaymentService.getPaymentStatus({
  token: 'ORDER-1234567890',
  provider: 'paypal'
})

const iyzicoStatus = await PaymentService.getPaymentStatus({
  token: 'iyzico_token',
  provider: 'iyzico'
})
```

### Get Available Providers

```typescript
import { PaymentService } from '@/modules/payment'

// List all available providers
const providers = PaymentService.getAvailableProviders()
// ['stripe', 'paypal', 'iyzico']

// Get the default provider
const defaultProvider = PaymentService.getDefaultProvider()
// 'stripe' (or whatever is set in PAYMENT_DEFAULT_PROVIDER)
```

### Validation with Zod Schemas

```typescript
import { GetPaymentStatusRequestSchema } from '@/modules/payment'

// Validate request data
const result = GetPaymentStatusRequestSchema.safeParse({
  token: 'some_token',
  provider: 'stripe'
})

if (result.success) {
  const validatedData = result.data
  // Process payment
} else {
  console.error(result.error.issues)
}
```

## Providers

### Stripe

Stripe provider uses the Stripe REST API with Bearer token authentication.

**Token Format**: Payment Intent ID (e.g., `pi_1234567890`)

**Response**: Returns the payment intent status string.

```typescript
const status = await PaymentService.getPaymentStatus({
  token: 'pi_1234567890',
  provider: 'stripe'
})
// Returns: 'succeeded' | 'processing' | 'requires_payment_method' | ...
```

### PayPal

PayPal provider uses OAuth 2.0 authentication with automatic token refresh.

**Token Format**: Order ID (e.g., `ORDER-1234567890`)

**Response**: Returns the full order object.

```typescript
const order = await PaymentService.getPaymentStatus({
  token: 'ORDER-1234567890',
  provider: 'paypal'
})
// Returns: { id, status, purchase_units, ... }
```

### Iyzico

Iyzico provider uses HMAC-SHA256 signature authentication.

**Token Format**: Checkout form token

**Response**: Returns the payment status string.

```typescript
const status = await PaymentService.getPaymentStatus({
  token: 'iyzico_checkout_token',
  provider: 'IYZICO'
})
// Returns: 'success' | 'failure' | ...
```

### Alipay (China)

Alipay is the largest mobile payment platform in China (Ant Group). Uses RSA2 (SHA256-with-RSA) signature authentication against the gateway endpoint.

**Token Format**: Merchant `out_trade_no` (the `paymentId` we pass through `metadata.paymentId`).

**Checkout flow**: `createCheckoutSession` returns a fully-signed URL targeting `alipay.trade.page.pay` (PC web). For mobile, switch the method to `alipay.trade.wap.pay`.

**Status**: queried via `alipay.trade.query` — returns `trade_status` (e.g. `WAIT_BUYER_PAY`, `TRADE_SUCCESS`, `TRADE_CLOSED`, `TRADE_FINISHED`).

```typescript
const status = await PaymentService.getProviderStatus({
  token: 'OUT_TRADE_NO_123',
  provider: 'ALIPAY'
})
```

### WeChat Pay (China)

WeChat Pay (微信支付) is Tencent's payment platform — second-largest in China. Uses **API v3** with SHA256-RSA2048 request signing via the merchant private key + serial number.

**Token Format**: Merchant `out_trade_no`.

**Checkout flow**: `createCheckoutSession` calls `POST /v3/pay/transactions/native` and returns a `code_url` (a `weixin://wxpay/...` URI) which the frontend renders as a QR code. For JSAPI / H5 / App flows, swap the endpoint accordingly.

**Currency**: Only `CNY` is supported by WeChat Pay (the provider normalizes any input to `CNY`).

**Status**: queried via `GET /v3/pay/transactions/out-trade-no/{out_trade_no}` — returns `trade_state` (`SUCCESS`, `NOTPAY`, `CLOSED`, `REFUND`, `PAYERROR`, …).

```typescript
const status = await PaymentService.getProviderStatus({
  token: 'OUT_TRADE_NO_123',
  provider: 'WECHATPAY'
})
```

### YooKassa (Russia)

YooKassa (formerly Yandex.Kassa, now operated by Sber) is the most widely-used Russian payment gateway. Uses HTTP Basic auth with `shopId:secretKey`.

**Token Format**: YooKassa `payment.id` (UUID returned from create).

**Checkout flow**: `createCheckoutSession` calls `POST /v3/payments` with an `Idempotence-Key` header and returns `confirmation.confirmation_url` for redirect.

**Status**: `pending`, `waiting_for_capture`, `succeeded`, `canceled`.

```typescript
const status = await PaymentService.getProviderStatus({
  token: 'yookassa_payment_uuid',
  provider: 'YOOKASSA'
})
```

### CloudPayments (Russia)

CloudPayments is a popular Russian acquirer used by major e-commerce. Uses HTTP Basic auth with `publicId:apiSecret`.

**Token Format**: `InvoiceId` (the `paymentId` we set in metadata).

**Checkout flow**: `createCheckoutSession` calls `POST /orders/create` and returns `Model.Url` for redirect. (For embedded widget flows, swap to client-side widget integration.)

**Status**: queried via `POST /payments/find` with the `InvoiceId` — returns `Model.Status` (`Completed`, `Authorized`, `Declined`, …).

```typescript
const status = await PaymentService.getProviderStatus({
  token: 'INVOICE_ID_123',
  provider: 'CLOUDPAYMENTS'
})
```

## API Reference

### PaymentService

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getPaymentStatus` | `GetPaymentStatusDTO` | `Promise<any>` | Get payment status from provider |
| `getAvailableProviders` | - | `PaymentProviderType[]` | List all available providers |
| `getDefaultProvider` | - | `PaymentProviderType` | Get default provider name |

### GetPaymentStatusDTO

```typescript
interface GetPaymentStatusDTO {
  token: string           // Required: Payment token/ID
  provider?: PaymentProviderType  // Optional: Override default provider
}
```

## Types & Schemas

### Enums

```typescript
import {
  PaymentProviderEnum,    // z.enum(['STRIPE', 'PAYPAL', 'IYZICO', 'ALIPAY', 'WECHATPAY', 'YOOKASSA', 'CLOUDPAYMENTS'])
  PaymentStatusEnum,      // z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', ...])
  PaymentCurrencyEnum,    // z.enum([...180+ ISO 4217 codes])
} from '@/modules/payment'

// Type inference
type PaymentProvider = 'STRIPE' | 'PAYPAL' | 'IYZICO' | 'ALIPAY' | 'WECHATPAY' | 'YOOKASSA' | 'CLOUDPAYMENTS'
type PaymentCurrency = 'USD' | 'EUR' | 'TRY' | 'CNY' | 'RUB' | ... // 180+ currencies
```

### Schemas

```typescript
import {
  GetPaymentStatusRequestSchema,
  PaymentResultSchema,
  PaymentConfigSchema,
} from '@/modules/payment'
```

## Currency Support

The module uses `currency-codes-ts` package for ISO 4217 currency support.

### Available Utilities

```typescript
import {
  PaymentCurrencyEnum,
  getCurrencyByCode,
  getCurrencyByCountry,
  getAllCurrencyCodes,
  type CurrencyCode,
  type CurrencyCodeRecord,
} from '@/modules/payment'

// Validate currency code
PaymentCurrencyEnum.parse('USD') // Valid
PaymentCurrencyEnum.parse('XXX') // Throws ZodError

// Get currency details
const usd = getCurrencyByCode('USD')
// {
//   code: 'USD',
//   number: '840',
//   digits: 2,
//   currency: 'US Dollar',
//   countries: ['United States of America (The)', ...]
// }

// Get currencies by country
const currencies = getCurrencyByCountry('Germany')
// [{ code: 'EUR', currency: 'Euro', ... }]

// Get all currency codes
const allCodes = getAllCurrencyCodes()
// ['AED', 'AFN', 'ALL', ... 180+ codes]
```

## Error Handling

All error messages are centralized in `payment.messages.ts`:

```typescript
import { PAYMENT_MESSAGES } from '@/modules/payment'

// Available messages:
PAYMENT_MESSAGES.PROVIDER_NOT_FOUND        // 'Payment provider not found'
PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED   // 'Payment provider not configured'
PAYMENT_MESSAGES.GET_STATUS_FAILED         // 'Failed to get payment status'
PAYMENT_MESSAGES.INVALID_TOKEN             // 'Invalid payment token'
PAYMENT_MESSAGES.TRANSACTION_FAILED        // 'Transaction failed'
PAYMENT_MESSAGES.PAYPAL_ACCESS_TOKEN_FAILED // 'Failed to obtain PayPal access token'
PAYMENT_MESSAGES.PAYPAL_GET_STATUS_FAILED  // 'Failed to get PayPal payment status'
PAYMENT_MESSAGES.STRIPE_GET_STATUS_FAILED  // 'Failed to get Stripe payment status'
PAYMENT_MESSAGES.IYZICO_GET_STATUS_FAILED  // 'Failed to get Iyzico payment status'
```

### Error Handling Example

```typescript
import { PaymentService, PAYMENT_MESSAGES } from '@/modules/payment'

try {
  const status = await PaymentService.getPaymentStatus({
    token: 'invalid_token',
    provider: 'stripe'
  })
} catch (error) {
  if (error.message === PAYMENT_MESSAGES.STRIPE_GET_STATUS_FAILED) {
    // Handle Stripe-specific error
  }
  // Handle general error
}
```

## Adding New Providers

To add a new payment provider:

### 1. Create Provider Class

Create a new file `providers/newprovider.provider.ts`:

```typescript
import { AxiosInstance } from 'axios'
import BasePaymentProvider from './base.provider'
import { PAYMENT_MESSAGES } from '../payment.messages'

export default class NewProvider extends BasePaymentProvider {
  readonly name = 'newprovider'

  // Implement required methods
  getAxiosInstance(): AxiosInstance {
    // Return configured axios instance
  }

  async getPaymentStatus(token: string): Promise<any> {
    try {
      // Implement payment status retrieval
    } catch (error) {
      throw new Error(PAYMENT_MESSAGES.NEWPROVIDER_GET_STATUS_FAILED)
    }
  }
}
```

### 2. Update Enums

Add the new provider to `payment.enums.ts`:

```typescript
export const PaymentProviderEnum = z.enum(['stripe', 'paypal', 'iyzico', 'newprovider'])
```

### 3. Update Messages

Add error messages to `payment.messages.ts`:

```typescript
export const PAYMENT_MESSAGES = {
  // ... existing messages
  NEWPROVIDER_GET_STATUS_FAILED: 'Failed to get NewProvider payment status',
} as const
```

### 4. Register Provider

Update `payment.service.ts`:

```typescript
import NewProvider from './providers/newprovider.provider'

export default class PaymentService {
  private static readonly newProvider = new NewProvider()

  private static readonly PROVIDERS = new Map<PaymentProviderType, BasePaymentProvider>([
    // ... existing providers
    ['newprovider', PaymentService.newProvider],
  ])
}
```

## Caching

Single-record lookups are cached in Redis (TTL = `TENANT_CACHE_TTL`, default 5 min):

| Key | Returns | Used by |
|---|---|---|
| `payment:id:{paymentId}` | `SafePayment` | `getById` |
| `payment:tx:{paymentId}` | `PaymentWithTransactions` | `getByIdWithTransactions` |
| `payment_tx:id:{transactionId}` | `PaymentTransaction` | `getTransactionById` |

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

## Module Structure

```
modules/payment/
├── index.ts                 # Module exports
├── payment.service.ts       # Main service class
├── payment.dto.ts           # Data Transfer Objects (Zod schemas)
├── payment.enums.ts         # Enums and currency utilities
├── payment.types.ts         # TypeScript types and schemas
├── payment.messages.ts      # Centralized error messages
├── providers/
│   ├── base.provider.ts          # Abstract base provider
│   ├── stripe.provider.ts        # Stripe implementation
│   ├── paypal.provider.ts        # PayPal implementation
│   ├── iyzico.provider.ts        # Iyzico implementation (Turkey)
│   ├── alipay.provider.ts        # Alipay implementation (China)
│   ├── wechatpay.provider.ts     # WeChat Pay implementation (China)
│   ├── yookassa.provider.ts      # YooKassa implementation (Russia)
│   └── cloudpayments.provider.ts # CloudPayments implementation (Russia)
└── README.md                     # This file
```

## License

MIT
