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
