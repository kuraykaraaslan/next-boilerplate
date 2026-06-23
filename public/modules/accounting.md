# Accounting

- **id:** `accounting`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/accounting/`
- **tags:** accounting, ledger, finance, erp
- **icon:** `fas fa-book`
- **hasNextLayer:** true

Tenant-scoped double-entry accounting: chart of accounts, journal entries/lines, fiscal periods.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `setting`

## Services

- `accounting.account.service.ts`
- `accounting.journal-entry.service.ts`
- `accounting.journal.service.ts`
- `accounting.ledger-line.service.ts`
- `accounting.period.service.ts`

## DTOs

- `accounting.dto.ts`

## Entities

- `fiscal_periods.entity.ts`
- `journal_entries.entity.ts`
- `journal_lines.entity.ts`
- `journals.entity.ts`
- `ledger_accounts.entity.ts`

## Enums

- `accounting.enums.ts`

## Message keys

- `accounting.messages.ts`

## TypeORM entities

- `FiscalPeriod` (system) — `modules/accounting/server/entities/fiscal_periods.entity.ts`
- `Journal` (system) — `modules/accounting/server/entities/journals.entity.ts`
- `JournalEntry` (system) — `modules/accounting/server/entities/journal_entries.entity.ts`
- `JournalLine` (system) — `modules/accounting/server/entities/journal_lines.entity.ts`
- `LedgerAccount` (system) — `modules/accounting/server/entities/ledger_accounts.entity.ts`

## Next layer (modules_next/) surface

- `accounting/ui/accounting-accounts.page` _(ui, client)_
- `accounting/ui/accounting-journal-entry-id.page` _(ui, client)_
- `accounting/ui/accounting-journal.page` _(ui, client)_
- `accounting/ui/accounting-journals.page` _(ui, client)_
- `accounting/ui/accounting-ledger.page` _(ui, client)_
- `accounting/ui/accounting-periods.page` _(ui, client)_
- `accounting/ui/journal-entry-status-badge.component` _(ui, client)_
- `accounting/ui/journal-lines-panel.component` _(ui, client)_

## README

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
