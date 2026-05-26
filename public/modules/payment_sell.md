# Payment Sell

- **id:** `payment_sell`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/payment_sell/`
- **tags:** payment, sell, billing
- **icon:** `fas fa-shopping-cart`
- **hasNextLayer:** true

One-time product / service payment processing. Uses payment_core providers (Stripe, PayPal, Iyzico, Alipay, WeChat Pay, YooKassa, CloudPayments). Tenant-aware checkout sessions, transactions, and refunds.

## Dependencies

- **requires:** `db`, `env`, `setting`, `redis`, `logger`, `payment_core`

## Services

- `payment_sell.service.ts`
- `payment_sell.webhook.service.ts`

## DTOs

- `payment_sell.dto.ts`

## Entities

- `payment.entity.ts`
- `payment_transaction.entity.ts`

## Enums

- `payment_sell.enums.ts`

## Message keys

- `payment_sell.messages.ts`

## TypeORM entities

- `Payment` (system) — `modules/payment_sell/entities/payment.entity.ts`
- `PaymentTransaction` (system) — `modules/payment_sell/entities/payment_transaction.entity.ts`
