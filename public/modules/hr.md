# HR

- **id:** `hr`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/hr/`
- **tags:** hr, employees, erp
- **icon:** `fas fa-user-tie`
- **hasNextLayer:** true

Tenant-scoped HR: employees, departments and leave requests.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `setting`

## Services

- `hr.department.service.ts`
- `hr.employee.service.ts`
- `hr.leave-type.service.ts`
- `hr.leave.service.ts`

## DTOs

- `hr.dto.ts`

## Entities

- `departments.entity.ts`
- `employees.entity.ts`
- `leave_requests.entity.ts`
- `leave_types.entity.ts`

## Enums

- `hr.enums.ts`

## Message keys

- `hr.messages.ts`

## TypeORM entities

- `Department` (system) — `modules/hr/server/entities/departments.entity.ts`
- `Employee` (system) — `modules/hr/server/entities/employees.entity.ts`
- `LeaveRequest` (system) — `modules/hr/server/entities/leave_requests.entity.ts`
- `LeaveType` (system) — `modules/hr/server/entities/leave_types.entity.ts`

## Next layer (modules_next/) surface

- `hr/ui/employee-leave-panel.component` _(ui, client)_
- `hr/ui/hr-departments.page` _(ui, client)_
- `hr/ui/hr-employees-employee-id.page` _(ui, client)_
- `hr/ui/hr-employees.page` _(ui, client)_
- `hr/ui/hr-leave-types.page` _(ui, client)_
- `hr/ui/hr-leave.page` _(ui, client)_
- `hr/ui/hr-status-badge.component` _(ui, client)_

## README

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
