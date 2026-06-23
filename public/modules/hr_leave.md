# HR Leave

- **id:** `hr_leave`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/hr_leave/`
- **tags:** hr, leave, erp
- **icon:** `fas fa-plane-departure`
- **hasNextLayer:** true

Tenant-scoped HR leave: leave requests and leave types.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `setting`

## Services

- `hr_leave.leave-type.service.ts`
- `hr_leave.leave.service.ts`

## DTOs

- `hr_leave.dto.ts`

## Entities

- `leave_requests.entity.ts`
- `leave_types.entity.ts`

## Enums

- `hr_leave.enums.ts`

## Message keys

- `hr_leave.messages.ts`

## TypeORM entities

- `LeaveRequest` (system) — `modules/hr_leave/server/entities/leave_requests.entity.ts`
- `LeaveType` (system) — `modules/hr_leave/server/entities/leave_types.entity.ts`

## Next layer (modules_next/) surface

- `hr_leave/ui/employee-leave-panel.component` _(ui, client)_
- `hr_leave/ui/hr_leave-settings.page` _(ui, client)_
- `hr_leave/ui/hr_leave-status-badge.component` _(ui, client)_
- `hr_leave/ui/hr-leave-settings.page` _(ui, client)_
- `hr_leave/ui/hr-leave.page` _(ui, client)_
- `hr_leave/ui/leave-types-panel.component` _(ui, client)_

## README

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
