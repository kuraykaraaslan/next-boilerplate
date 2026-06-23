# Payroll

- **id:** `payroll`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/payroll/`
- **tags:** payroll, hr, erp
- **icon:** `fas fa-money-check-dollar`
- **hasNextLayer:** true

Tenant-scoped payroll: payroll runs, payslips and salary components.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `setting`

## Services

- `payroll.component.service.ts`
- `payroll.line.service.ts`
- `payroll.payslip.service.ts`
- `payroll.run.service.ts`

## DTOs

- `payroll.dto.ts`

## Entities

- `payroll_runs.entity.ts`
- `payslip_lines.entity.ts`
- `payslips.entity.ts`
- `salary_components.entity.ts`

## Enums

- `payroll.enums.ts`

## Message keys

- `payroll.messages.ts`

## TypeORM entities

- `PayrollRun` (system) — `modules/payroll/server/entities/payroll_runs.entity.ts`
- `Payslip` (system) — `modules/payroll/server/entities/payslips.entity.ts`
- `PayslipLine` (system) — `modules/payroll/server/entities/payslip_lines.entity.ts`
- `SalaryComponent` (system) — `modules/payroll/server/entities/salary_components.entity.ts`

## Next layer (modules_next/) surface

- `payroll/ui/payroll-payslips-payslip-id.page` _(ui, client)_
- `payroll/ui/payroll-payslips.page` _(ui, client)_
- `payroll/ui/payroll-runs-run-id.page` _(ui, client)_
- `payroll/ui/payroll-runs.page` _(ui, client)_
- `payroll/ui/payroll-settings.page` _(ui, client)_
- `payroll/ui/payroll-status-badge.component` _(ui, client)_
- `payroll/ui/payslip-lines-panel.component` _(ui, client)_
- `payroll/ui/salary-components-panel.component` _(ui, client)_

## README

# Payroll Module

Tenant-scoped payroll: payroll runs, payslips and salary components. Every row is
isolated by `tenantId` and service methods take `tenantId` as their first argument
(per `multi-tenancy-patterns.md`).

## Public API

Import from the barrel `@/modules/payroll`:

| Export | Type | Use |
|---|---|---|
| `PayrollRunService` | class | Payroll run CRUD |
| `PayslipService` | class | Payslip CRUD |
| `Create*DTO` / `Update*DTO` | Zod | Input validation |
| `*Schema` | Zod | Output typing |
| `PAYROLL_MESSAGES` | object | Error/message constants |

## Entities

- `PayrollRun` (`payroll_runs`) — `period`, `status`, `runDate` (soft-deletable).
- `Payslip` (`payslips`) — `runId`, `employeeId`, `gross`, `deductions`, `net`, `status`.
- `SalaryComponent` (`salary_components`) — `employeeId`, `type`, `name`, `amount` (soft-deletable).

## Menu

- **Payroll Runs** (`/admin/payroll/runs`, workspace `hr`).
- **Payslips** (`/admin/payroll/payslips`, workspace `hr`).

## Dependencies

`db`, `env`, `redis`, `logger`, `setting`.
