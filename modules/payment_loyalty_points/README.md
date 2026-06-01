# payment_loyalty_points

Tenant-aware loyalty points program. Framework-agnostic — no `next/*`, no `react`, no browser APIs.

Users earn points (e.g. on orders/payments), redeem them, and climb **tiers** based on lifetime points. Tiers apply an **earn multiplier** so higher tiers accrue points faster. Every balance change is recorded in an append-only transaction ledger.

## Domain model

- **LoyaltyAccount** (`loyalty_accounts`) — one account per user per tenant. Holds the current spendable `balance`, the running `lifetimePoints` (total ever earned, drives the tier), and the resolved `tier` code (default `BRONZE`).
- **LoyaltyTransaction** (`loyalty_transactions`) — append-only ledger row per balance mutation. `type` ∈ `EARN | REDEEM | EXPIRE | ADJUST | REVOKE`. `points` is positive for credits (EARN, positive ADJUST) and negative for debits (REDEEM, EXPIRE, negative ADJUST, REVOKE). Stores `balanceAfter`, optional `reason`, optional `referenceType`/`referenceId` (e.g. `order` / `payment`), and an optional `expiresAt` for EARN lots.
- **LoyaltyTier** (`loyalty_tiers`) — tenant-defined tier (e.g. `BRONZE`, `SILVER`, `GOLD`). `minPoints` is the lifetime threshold, `multiplier` (decimal 6,2) is the earn multiplier, plus `benefits` (jsonb), `sortOrder`, and `isActive`.

Every entity carries an indexed `tenantId` (uuid). All DB access goes through `tenantDataSourceFor(tenantId)`.

## Earn / redeem / tier model

- **Earn** — load (or create) the account. If `applyMultiplier` (default true), the requested points are multiplied by the account's **current** tier multiplier and rounded to an int. Both `balance` and `lifetimePoints` increase, an `EARN` ledger row is written (with `expiresAt = now + expiresInDays` when supplied), then the tier is recomputed from the new `lifetimePoints`.
- **Redeem** — requires `balance >= points`, otherwise throws `INSUFFICIENT_POINTS`. Decrements `balance` and writes a `REDEEM` row (negative points). Redeeming does not touch `lifetimePoints` or the tier.
- **Adjust** — manual admin correction; `points` may be positive or negative. Balance is floored at 0. Positive adjustments also accrue toward `lifetimePoints` and trigger a tier recompute. Writes an `ADJUST` row.
- **Tier recompute** — picks the highest **active** tier whose `minPoints <= lifetimePoints`; falls back to `BRONZE` when none match. Called internally by `earn` and `adjust`.
- **Expiry** — `expirePoints` scans EARN lots whose `expiresAt` has passed, debits the corresponding points from the account (capped at the current balance), writes `EXPIRE` rows, and clears each lot's `expiresAt` so it isn't double-counted. Returns the number of lots processed.

> NOTE: expiry is a simple FIFO-by-lot pass — production may need full lot-based tracking (per-lot remaining balances).

All balance mutations (`earn`, `redeem`, `adjust`, `recomputeTier`, `expirePoints`) run inside `ds.transaction(...)` to avoid races on the balance.

## Service methods

`PaymentLoyaltyPointsService` — all static.

| Method | Description |
| --- | --- |
| `getOrCreateAccount(tenantId, userId)` | Find or create the user's account. |
| `getAccount(tenantId, userId)` | Account + resolved `tierDetail` (cached via `singleFlight`). |
| `getBalance(tenantId, userId)` | Current spendable balance. |
| `earn(tenantId, dto)` | Credit points (optional multiplier + expiry), recompute tier. |
| `redeem(tenantId, dto)` | Debit points; throws `INSUFFICIENT_POINTS` if balance too low. |
| `adjust(tenantId, dto)` | Manual +/- correction, floored at 0, recompute tier. |
| `listTransactions(tenantId, query)` | Paginated ledger (`{ data, total }`). |
| `recomputeTier(tenantId, accountId)` | Re-resolve tier from lifetime points. |
| `createTier(tenantId, dto)` | Create a tier (unique `code` per tenant). |
| `updateTier(tenantId, tierId, dto)` | Partial tier update. |
| `listTiers(tenantId)` | Tiers ordered by `minPoints` asc. |
| `expirePoints(tenantId)` | Expire due EARN lots; returns count processed. |

## Cache keys

- `loyalty:user:<userId>` — `getAccount` result (singleFlight).
- `loyalty:<accountId>` — account-keyed entry.

Both keys are busted on every balance mutation.

## Dependencies

`db`, `env`, `redis`, `logger`.

## Usage

```ts
import { PaymentLoyaltyPointsService } from '@/modules/payment_loyalty_points'

// Define tiers (once per tenant)
await PaymentLoyaltyPointsService.createTier(tenantId, { name: 'Bronze', code: 'BRONZE', minPoints: 0 })
await PaymentLoyaltyPointsService.createTier(tenantId, { name: 'Gold', code: 'GOLD', minPoints: 1000, multiplier: 1.5 })

// Earn points on an order (multiplier applied from current tier)
await PaymentLoyaltyPointsService.earn(tenantId, {
  userId,
  points: 200,
  referenceType: 'order',
  referenceId: orderId,
  expiresInDays: 365,
})

// Redeem at checkout
await PaymentLoyaltyPointsService.redeem(tenantId, { userId, points: 150, reason: 'Checkout discount' })

// Read balance + tier
const account = await PaymentLoyaltyPointsService.getAccount(tenantId, userId)
console.log(account.balance, account.tier, account.tierDetail?.multiplier)

// Scheduled job: expire due points
const expired = await PaymentLoyaltyPointsService.expirePoints(tenantId)
```
