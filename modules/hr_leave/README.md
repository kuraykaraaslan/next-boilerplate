# HR Leave Module

Tenant-scoped HR leave: leave requests and leave types. Every row is isolated
by `tenantId` and service methods take `tenantId` as their first argument
(per `multi-tenancy-patterns.md`).

## Public API

Import from the barrel `@kuraykaraaslan/hr_leave`:

| Export | Type | Use |
|---|---|---|
| `LeaveRequestService` | class | Leave request CRUD + approve/reject |
| `LeaveTypeService` | class | Leave type (master-data) CRUD |
| `Create*DTO` / `Update*DTO` | Zod | Input validation |
| `*Schema` | Zod | Row shapes |
| `HR_LEAVE_MESSAGES` | object | Error/message constants |

## Entities

- `LeaveRequest` (`leave_requests`) — `employeeId`, `type`, `startDate`, `endDate`, `status`, `reason?`.
- `LeaveType` (`leave_types`) — `name`, `code`, `paid`, `maxDaysPerYear`, `color?`.

## Menu

- **Leave** (`/admin/hr/leave`, workspace `hr`).
- **Leave Settings** (`/admin/hr-leave/settings`, workspace `hr`).

## Dependencies

`db`, `env`, `redis`, `logger`, `setting`.
