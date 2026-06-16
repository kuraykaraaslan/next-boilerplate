# Metering

- **id:** `metering`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/metering/`
- **tags:** metering, usage, billing, overage, credits
- **icon:** `fas fa-gauge-high`
- **hasNextLayer:** false

Event-based usage metering with metered / overage billing. Records immutable usage events per meter (SUM/MAX/LAST aggregation), keeps a Redis hot counter for fast current-period reads, and settles overages on a two-rail model: prepaid wallet credits are debited first, the remainder is invoiced as a draft. Quantities and money are integer minor units; runs are idempotent and persisted.

## Dependencies

- **requires:** `db`, `env`, `logger`, `common`, `redis`, `wallet`, `invoice`, `tenant_subscription`, `webhook`, `audit_log`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/metering/billing`
- `tenant` POST `/tenant/[tenantId]/api/metering/events`
- `tenant` GET/POST `/tenant/[tenantId]/api/metering/meters`
- `tenant` GET/PATCH/DELETE `/tenant/[tenantId]/api/metering/meters/[meterId]`
- `tenant` GET `/tenant/[tenantId]/api/metering/usage`

## TypeORM entities

- `MeterDefinition` (system) — `modules/metering/server/entities/meter_definition.entity.ts`
- `MeteredBillingRun` (system) — `modules/metering/server/entities/metered_billing_run.entity.ts`
- `MeteredUsageEvent` (system) — `modules/metering/server/entities/metered_usage_event.entity.ts`
