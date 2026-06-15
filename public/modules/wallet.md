# Wallet

- **id:** `wallet`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/wallet/`
- **tags:** wallet, credits, ledger, double-entry, billing
- **icon:** `fas fa-wallet`
- **hasNextLayer:** true

Internal credit / wallet ledger. Double-entry accounting where every movement is a balanced transaction whose signed postings sum to zero, with per-account tamper-evident hash chains, peer-to-peer credit transfers, issue/spend flows, and booking capture/refund. Balances are integer minor units; chain verification + reconciliation included.

## Dependencies

- **requires:** `db`, `env`, `logger`, `common`, `redis`, `webhook`, `audit_log`

## Services

- `wallet.crud.service.ts`
- `wallet.posting.service.ts`
- `wallet.reconcile.service.ts`
- `wallet.service.ts`

## DTOs

- `wallet.dto.ts`

## Entities

- `wallet_account.entity.ts`
- `wallet_posting.entity.ts`
- `wallet_transaction.entity.ts`

## Enums

- `wallet.enums.ts`

## Message keys

- `wallet.messages.ts`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/wallet/accounts`
- `tenant` GET `/tenant/[tenantId]/api/wallet/accounts/[accountId]`
- `tenant` GET `/tenant/[tenantId]/api/wallet/accounts/[accountId]/statement`
- `tenant` GET/POST `/tenant/[tenantId]/api/wallet/transactions`
- `tenant` POST `/tenant/[tenantId]/api/wallet/transfer`
- `tenant` POST `/tenant/[tenantId]/api/wallet/verify`

## TypeORM entities

- `WalletAccount` (system) — `modules/wallet/entities/wallet_account.entity.ts`
- `WalletPosting` (system) — `modules/wallet/entities/wallet_posting.entity.ts`
- `WalletTransaction` (system) — `modules/wallet/entities/wallet_transaction.entity.ts`

## Next layer (modules_next/) surface

- `wallet/ui/wallet-account-columns` _(ui, client)_
