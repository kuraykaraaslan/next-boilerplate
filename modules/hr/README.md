# HR Module

Tenant-scoped HR: employees, departments and leave requests. Every row is
isolated by `tenantId` and service methods take `tenantId` as their first
argument (per `multi-tenancy-patterns.md`).

## Public API

Import from the barrel `@kuraykaraaslan/hr`:

| Export | Type | Use |
|---|---|---|
| `EmployeeService` | class | Employee CRUD |
| `DepartmentService` | class | Department CRUD |
| `LeaveRequestService` | class | Leave request CRUD |
| `Create*DTO` / `Update*DTO` | Zod | Input validation |
| `*Schema` | Zod | Row shapes |
| `HR_MESSAGES` | object | Error/message constants |

## Entities

- `Department` (`departments`) — `name`, `code`, `managerId?`, `isActive`.
- `Employee` (`employees`) — `firstName`, `lastName`, `email`, `departmentId?`, `title?`, `status`, `hiredAt?`, `userId?`.
- `LeaveRequest` (`leave_requests`) — `employeeId`, `type`, `startDate`, `endDate`, `status`, `reason?`.

## Menu

- **Employees** (`/admin/hr/employees`, workspace `hr`).
- **Departments** (`/admin/hr/departments`, workspace `hr`).
- **Leave** (`/admin/hr/leave`, workspace `hr`).

## Dependencies

`db`, `env`, `redis`, `logger`, `setting`.
