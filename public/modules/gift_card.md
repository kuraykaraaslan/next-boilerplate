# Gift Card

- **id:** `gift_card`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/gift_card/`
- **tags:** billing, commerce, gift-card, wallet
- **icon:** `fas fa-gift`
- **hasNextLayer:** true

Prepaid gift cards: issue (single + bulk) hash-protected codes, track redeemable balance, and redeem into a user's wallet. Redemption posts a wallet credit in the card's currency; supports partial redemption, void, admin balance adjustment, and an expiry sweep. Builds on wallet (credit) and payment (purchase-backed issuing).

## Dependencies

- **requires:** `db`, `env`, `logger`, `common`, `redis`, `wallet`, `payment`, `webhook`, `tenant_subscription`

## Services

- `gift_card.crud.service.ts`
- `gift_card.redemption.service.ts`
- `gift_card.service.ts`

## DTOs

- `gift_card.dto.ts`

## Entities

- `gift_card.entity.ts`
- `gift_card_transaction.entity.ts`

## Enums

- `gift_card.enums.ts`

## Message keys

- `gift_card.messages.ts`

## Jobs

- `gift_card.expiry.job.ts`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/gift-cards`
- `tenant` GET/PATCH/DELETE `/tenant/[tenantId]/api/gift-cards/[giftCardId]`
- `tenant` GET `/tenant/[tenantId]/api/gift-cards/[giftCardId]/transactions`
- `tenant` POST `/tenant/[tenantId]/api/gift-cards/balance`
- `tenant` POST `/tenant/[tenantId]/api/gift-cards/redeem`

## TypeORM entities

- `GiftCard` (system) — `modules/gift_card/server/entities/gift_card.entity.ts`
- `GiftCardTransaction` (system) — `modules/gift_card/server/entities/gift_card_transaction.entity.ts`

## Next layer (modules_next/) surface

- `gift_card/ui/gift-card-issue-modal.component` _(ui, client)_
- `gift_card/ui/gift-card-list-columns.component` _(ui, client)_
- `gift_card/ui/gift-cards-gift-card-id.page` _(ui, client)_
- `gift_card/ui/gift-cards.page` _(ui, client)_

## README

# gift_card

Prepaid gift cards built on top of `wallet` (credit) and `payment` (purchase-backed
issuing). A gift card holds a redeemable balance in integer minor units; redeeming
it posts a wallet credit to the redeeming user.

## What it does

- **Issue** single or bulk cards with a hash-protected code. The human-readable
  `code` (e.g. `GC-7K4M-9PQ2-XR3T`) is returned **once** from `issue()`; the
  database only stores its SHA-256 `codeHash` (api_key-style), so a leaked row
  never exposes a spendable code.
- **Redeem** (full or partial) into the user's wallet via
  `WalletService.issue(...)`. The card's `remainingAmount` is decremented and a
  REDEEM ledger row is written, linked to the resulting wallet transaction.
- **Balance check** by raw code (read-only).
- **Void** (forfeit remaining balance) and **adjust** (signed admin correction).
- **Expiry sweep** (`gift_card.expiry.job.ts`) flips past-due cards to `EXPIRED`.

Issuing is feature-gated via `FEATURE_KEYS.FEATURE_GIFT_CARDS`
(`TenantSubscriptionService.assertFeatureAccess`); the root tenant bypasses.

## Public API — `GiftCardService`

| Method | Description |
|---|---|
| `issue(tenantId, dto)` | Issue 1..N cards. Returns `{ giftCards, rawCodes }`; raw codes shown once. |
| `getAll(tenantId, query)` | Paginated list (filter by `status` / `purchaserUserId` / code search). |
| `getById(tenantId, giftCardId)` | Single card (Redis-cached). |
| `getByCode(tenantId, rawCode)` | Resolve by raw code via hash; `null` when unknown (negative-cached). |
| `listTransactions(tenantId, giftCardId)` | Append-only ledger for a card. |
| `checkBalance(tenantId, rawCode)` | Read-only `{ status, remainingAmount, currency, expiresAt }`. |
| `redeem(tenantId, dto)` | Redeem (partial/full) → wallet credit. Returns `RedeemResult`. |
| `void(tenantId, giftCardId, reason?)` | Void a card, forfeit remaining balance. |
| `adjust(tenantId, giftCardId, dto)` | Apply a signed delta to the balance. |
| `issueForCompletedPayment(tenantId, paymentId, recipient?)` | Issue a card backed by a COMPLETED payment (call from the payment-success path). |

## Entities

- `GiftCard` → `gift_cards` — `code` (Unique per tenant), `codeHash` (unique),
  `status`, `initialAmount`/`remainingAmount` (minor units), `currency`,
  purchaser/recipient refs, `expiresAt`.
- `GiftCardTransaction` → `gift_card_transactions` — append-only ledger
  (`ISSUE | REDEEM | ADJUST | VOID`), signed `amount`, `balanceAfter`,
  `walletTransactionId`.

## Webhook events

`gift_card.issued`, `gift_card.redeemed`, `gift_card.voided`, `gift_card.expired`
(group **Gift Cards**, tenant scope).

## Integration notes

- **Redemption** calls `WalletService.issue(tenantId, { userId, amount, currency, referenceType: 'gift_card', referenceId })`. The wallet credit is posted **before** the card is mutated, so a wallet failure never burns balance.
- **Purchase** there is no generic post-payment event bus yet; the payment-success
  route should call `GiftCardService.issueForCompletedPayment(...)` explicitly.
