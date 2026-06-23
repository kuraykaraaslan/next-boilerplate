# HR

- **id:** `hr`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/hr/`
- **tags:** hr, employees, erp
- **icon:** `fas fa-user-tie`
- **hasNextLayer:** true

Tenant-scoped HR: employees and departments.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `setting`

## Services

- `hr.department.service.ts`
- `hr.employee.service.ts`

## DTOs

- `hr.dto.ts`

## Entities

- `departments.entity.ts`
- `employees.entity.ts`

## Enums

- `hr.enums.ts`

## Message keys

- `hr.messages.ts`

## TypeORM entities

- `Department` (system) — `modules/hr/server/entities/departments.entity.ts`
- `Employee` (system) — `modules/hr/server/entities/employees.entity.ts`

## Next layer (modules_next/) surface

- `hr/ui/hr-departments-settings.page` _(ui, client)_
- `hr/ui/hr-departments.page` _(ui, client)_
- `hr/ui/hr-employees-employee-id.page` _(ui, client)_
- `hr/ui/hr-employees-settings.page` _(ui, client)_
- `hr/ui/hr-employees.page` _(ui, client)_
- `hr/ui/hr-status-badge.component` _(ui, client)_

## README

# HR Module

Tenant-scoped HR: employees and departments. Every row is isolated by
`tenantId` and service methods take `tenantId` as their first argument
(per `multi-tenancy-patterns.md`). Leave lives in the `hr_leave` module.

## Public API

Import from the barrel `@kuraykaraaslan/hr`:

| Export | Type | Use |
|---|---|---|
| `EmployeeService` | class | Employee CRUD |
| `DepartmentService` | class | Department CRUD |
| `Create*DTO` / `Update*DTO` | Zod | Input validation |
| `*Schema` | Zod | Row shapes |
| `HR_MESSAGES` | object | Error/message constants |

## Entities

- `Department` (`departments`) — `name`, `code`, `managerId?`, `isActive`.
- `Employee` (`employees`) — `firstName`, `lastName`, `email`, `departmentId?`, `title?`, `status`, `hiredAt?`, `userId?`.

## Menu

- **Employees** (`/admin/hr/employees`, workspace `hr`).
- **Departments** (`/admin/hr/departments`, workspace `hr`).

## Dependencies

`db`, `env`, `redis`, `logger`, `setting`.
