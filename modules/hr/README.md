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
