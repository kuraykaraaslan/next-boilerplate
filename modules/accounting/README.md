# Accounting Module

Tenant-scoped double-entry accounting: chart of accounts, journal entries/lines
and fiscal periods. Every row is isolated by `tenantId`, and service methods take
`tenantId` as their first argument (per `multi-tenancy-patterns.md`).

> This module is **scaffolded** — entities, types, DTOs and a placeholder page
> exist, but business logic and API routes are coming soon.

## Entities

- `LedgerAccount` (`ledger_accounts`) — chart-of-accounts node: `code`, `name`, `type` (`ASSET`/`LIABILITY`/`EQUITY`/`REVENUE`/`EXPENSE`), optional `parentId`, `isActive`.
- `JournalEntry` (`journal_entries`) — a posting header: `number`, `description`, `status` (`DRAFT`/`POSTED`/`VOID`), `entryDate`, `postedAt`.
- `JournalLine` (`journal_lines`) — a debit/credit line: `entryId`, `accountId`, `debit`, `credit`, `memo`.
- `FiscalPeriod` (`fiscal_periods`) — an accounting period: `name`, `startDate`, `endDate`, `status`.

## Menu

- **Chart of Accounts** → `/admin/accounting/accounts`
- **Journal** → `/admin/accounting/journal`
- **Ledger** → `/admin/accounting/ledger`
- **Periods** → `/admin/accounting/periods`

All items live in the `Finance` group of the `erp` workspace, scoped to `tenant`.

## Dependencies

`db`, `env`, `redis`, `logger`, `setting`.
