# Payment Loyalty Points

- **id:** `payment_loyalty_points`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/payment_loyalty_points/`
- **tags:** loyalty, points, rewards, ecommerce
- **icon:** `fas fa-medal`
- **hasNextLayer:** false

Tenant-aware loyalty points program. Earn / redeem points, lifetime-driven tiers with earn multipliers, manual adjustments, transaction ledger, and point expiry.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`

## Services

- `payment_loyalty_points.account.service.ts`
- `payment_loyalty_points.checkout.service.ts`
- `payment_loyalty_points.ledger.service.ts`
- `payment_loyalty_points.service.ts`

## DTOs

- `payment_loyalty_points.dto.ts`

## Entities

- `loyalty_account.entity.ts`
- `loyalty_tier.entity.ts`
- `loyalty_transaction.entity.ts`

## Enums

- `payment_loyalty_points.enums.ts`

## Message keys

- `payment_loyalty_points.messages.ts`

## TypeORM entities

- `LoyaltyAccount` (system) — `modules/payment_loyalty_points/server/entities/loyalty_account.entity.ts`
- `LoyaltyTier` (system) — `modules/payment_loyalty_points/server/entities/loyalty_tier.entity.ts`
- `LoyaltyTransaction` (system) — `modules/payment_loyalty_points/server/entities/loyalty_transaction.entity.ts`

## README

# payment_loyalty_points

Tenant-aware loyalty points program. Framework-agnostic — no `next/*`, no `react`, no browser APIs.

Users earn points (e.g. on orders/payments), redeem them, and climb **tiers** based on lifetime points. Tiers apply an **earn multiplier** so higher tiers accrue points faster. Every balance change is recorded in an append-only transaction ledger.

---

## Domain model

- **LoyaltyAccount** (`loyalty_accounts`) — one account per user per tenant. Holds the current spendable `balance`, the running `lifetimePoints` (total ever earned, drives the tier), and the resolved `tier` code (default `BRONZE`).
- **LoyaltyTransaction** (`loyalty_transactions`) — append-only ledger row per balance mutation. `type` ∈ `EARN | REDEEM | EXPIRE | ADJUST | REVOKE`. `points` is positive for credits (EARN, positive ADJUST) and negative for debits (REDEEM, EXPIRE, negative ADJUST, REVOKE). Stores `balanceAfter`, optional `reason`, optional `referenceType`/`referenceId` (e.g. `order` / `payment`), and an optional `expiresAt` for EARN lots.
- **LoyaltyTier** (`loyalty_tiers`) — tenant-defined tier (e.g. `BRONZE`, `SILVER`, `GOLD`). `minPoints` is the lifetime threshold, `multiplier` (decimal 6,2) is the earn multiplier, plus `benefits` (jsonb), `sortOrder`, and `isActive`.

Every entity carries an indexed `tenantId` (uuid). All DB access goes through `tenantDataSourceFor(tenantId)`.

---

## Earn / redeem / tier model

- **Earn** — load (or create) the account. If `applyMultiplier` (default true), the requested points are multiplied by the account's **current** tier multiplier and rounded to an int. Both `balance` and `lifetimePoints` increase, an `EARN` ledger row is written (with `expiresAt = now + expiresInDays` when supplied), then the tier is recomputed from the new `lifetimePoints`.
- **Redeem** — requires `balance >= points`, otherwise throws `INSUFFICIENT_POINTS`. Decrements `balance` and writes a `REDEEM` row (negative points). Redeeming does not touch `lifetimePoints` or the tier.
- **Adjust** — manual admin correction; `points` may be positive or negative. Balance is floored at 0. Positive adjustments also accrue toward `lifetimePoints` and trigger a tier recompute. Writes an `ADJUST` row.
- **Tier recompute** — picks the highest **active** tier whose `minPoints <= lifetimePoints`; falls back to `BRONZE` when none match. Called internally by `earn` and `adjust`.
- **Expiry** — `expirePoints` scans EARN lots whose `expiresAt` has passed, debits the corresponding points from the account (capped at the current balance), writes `EXPIRE` rows, and clears each lot's `expiresAt` so it isn't double-counted. Returns the number of lots processed.

> NOTE: expiry is a simple FIFO-by-lot pass — production may need full lot-based tracking (per-lot remaining balances).

All balance mutations (`earn`, `redeem`, `adjust`, `recomputeTier`, `expirePoints`) run inside `ds.transaction(...)` to avoid races on the balance.

---

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

---

## Cache keys

- `loyalty:user:<userId>` — `getAccount` result (singleFlight).
- `loyalty:<accountId>` — account-keyed entry.

Both keys are busted on every balance mutation.

---

## Dependencies

`db`, `env`, `redis`, `logger`.

---

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

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A tenant-aware loyalty program (earn/redeem/adjust points, lifetime-driven tiers with earn multipliers, transaction ledger, point expiry) whose entire surface is per-tenant data via tenantDataSourceFor(tenantId); it declares no setting keys and reads no platform/root config.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `LoyaltyTier` | `loyalty_tiers` | name, code, minPoints, multiplier, benefits, sortOrder, isActive |
| `LoyaltyAccount` | `loyalty_accounts` | userId, balance, lifetimePoints, tier, metadata |
| `LoyaltyTransaction` | `loyalty_transactions` | accountId, userId, type, points, reason, referenceType, referenceId, balanceAfter, expiresAt |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `payment_loyalty_points.service.ts:recomputeTierTx` — Each tenant defines its own active LoyaltyTier ladder (minPoints thresholds); tier recomputation picks the highest active tenant tier whose minPoints <= account.lifetimePoints, so the same lifetime point total maps to different tiers across tenants. Falls back to DEFAULT_TIER ('BRONZE') when no tier matches.
- `payment_loyalty_points.service.ts:earn` — When dto.applyMultiplier is set, the earn amount is scaled by the account's current tenant-defined LoyaltyTier.multiplier (e.g. 1.0/1.25/1.5), so identical earn requests credit different point totals per tenant depending on that tenant's tier multipliers.
- `payment_loyalty_points.service.ts:getAccount` — Account is enriched with the tenant's own LoyaltyTier row (name/benefits/multiplier) matched on tier code, so tier detail and benefits returned to the client differ per tenant.
- `payment_loyalty_points.service.ts:expirePoints` — Runs per real tenant (tenantDataSourceFor(tenantId)); each tenant's expired EARN lots are processed independently against that tenant's accounts/ledger.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Hardcoded default/fallback tier code 'BRONZE' (DEFAULT_TIER constant) used when creating accounts and when no active tier matches in recomputeTierTx | `payment_loyalty_points.service.ts:DEFAULT_TIER (used in getOrCreateAccount, earn, adjust, recomputeTierTx)` | Tenants can fully customize their tier ladder (codes, thresholds), but the base/entry tier code is globally fixed to 'BRONZE'. A tenant whose entry tier uses a different code (e.g. 'STANDARD' or 'STARTER') would get an inconsistent fallback that may not match any of their LoyaltyTier rows. The default tier should be configurable per tenant. | `loyaltyDefaultTierCode` |
| No per-tenant default point-expiry policy; expiry is driven only by an optional per-call expiresInDays on EarnPointsDTO and otherwise points never expire | `payment_loyalty_points.service.ts:earn (dto.expiresInDays) and expirePoints` | Whether and how fast earned points expire is a core loyalty-program policy that typically varies per tenant, but here it is only a caller-supplied per-request value with no tenant-level default, so the module cannot enforce a tenant-wide expiry window. | `loyaltyDefaultExpiryDays` |
| Earn-multiplier application is controlled solely by the per-request applyMultiplier flag (defaults true in DTO) with no tenant-level toggle | `payment_loyalty_points.dto.ts:EarnPointsDTO.applyMultiplier and payment_loyalty_points.service.ts:earn` | Whether tier multipliers are applied to earned points is a program-wide rule a tenant admin would plausibly want to enable/disable globally, rather than relying on every caller passing the flag correctly. | `loyaltyApplyTierMultiplier` |
