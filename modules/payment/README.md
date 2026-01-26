# Payment Module

A multi-provider payment gateway module supporting Stripe, PayPal, and Iyzico with full TypeScript support and Zod validation.

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

- **Multi-Provider Support**: Seamlessly switch between Stripe, PayPal, and Iyzico
- **Type Safety**: Full TypeScript support with Zod schema validation
- **ISO 4217 Currencies**: Support for 180+ currencies via `currency-codes-ts`
- **Provider Abstraction**: Unified interface across all payment providers
- **Centralized Error Messages**: All error messages defined in one place
- **Environment-Based Configuration**: Easy provider switching via environment variables

## Installation

The module is already included in the project. Ensure you have the required dependencies:

```bash
npm install axios crypto-js zod currency-codes-ts
```

## Configuration

### Environment Variables

```env
# Default payment provider (stripe | paypal | iyzico)
PAYMENT_DEFAULT_PROVIDER=stripe

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...

# PayPal Configuration
PAYPAL_API_URL=https://api-m.sandbox.paypal.com
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret

# Iyzico Configuration
IYZICO_API_KEY=your_api_key
IYZICO_SECRET_KEY=your_secret_key
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
```

### Production URLs

| Provider | Sandbox URL | Production URL |
|----------|-------------|----------------|
| Stripe | https://api.stripe.com/v1 | https://api.stripe.com/v1 |
| PayPal | https://api-m.sandbox.paypal.com | https://api-m.paypal.com |
| Iyzico | https://sandbox-api.iyzipay.com | https://api.iyzipay.com |

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
  provider: 'iyzico'
})
// Returns: 'success' | 'failure' | ...
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
  PaymentProviderEnum,    // z.enum(['stripe', 'paypal', 'iyzico'])
  PaymentStatusEnum,      // z.enum(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
  PaymentCurrencyEnum,    // z.enum([...180+ ISO 4217 codes])
} from '@/modules/payment'

// Type inference
type PaymentProviderType = 'stripe' | 'paypal' | 'iyzico'
type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'
type PaymentCurrency = 'USD' | 'EUR' | 'TRY' | ... // 180+ currencies
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
│   ├── base.provider.ts     # Abstract base provider
│   ├── stripe.provider.ts   # Stripe implementation
│   ├── paypal.provider.ts   # PayPal implementation
│   └── iyzico.provider.ts   # Iyzico implementation
└── README.md                # This file
```

## License

MIT
