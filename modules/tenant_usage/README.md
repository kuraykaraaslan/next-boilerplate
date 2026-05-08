# tenant_usage

Tracks per-tenant usage counters (API calls, AI tokens, storage bytes, email sends) by month. Counters are stored in Redis for low-latency O(1) increments and flushed to the `tenant_usage` PostgreSQL table by a background CRON job for durable reporting and plan-limit enforcement.

## What it does

- Provides `TenantUsageService` with static methods to increment counters and read/flush usage.
- The `TenantUsage` TypeORM entity persists monthly aggregates with a `UNIQUE(tenantId, month)` constraint.
- Redis keys expire automatically after 32 days so stale data is cleaned up.

## Redis key pattern

```
tenant:{tenantId}:usage:{metric}:{YYYY-MM}
```

Example: `tenant:abc-123:usage:apiCalls:2026-05`

Metrics: `apiCalls`, `aiTokens`, `storageBytes`, `emailSends`

## Incrementing counters

```typescript
import { TenantUsageService } from '@/modules/tenant_usage/tenant_usage.service';

// In an API route or middleware:
await TenantUsageService.incrementApiCall(tenantId);

// After an AI completion:
await TenantUsageService.incrementAiTokens(tenantId, tokensUsed);

// After a file upload:
await TenantUsageService.incrementStorageBytes(tenantId, fileSizeBytes);
```

## Reading usage

```typescript
const usage = await TenantUsageService.getUsage(tenantId);
// { apiCalls: 42, aiTokens: 8000, storageBytes: 1048576, emailSends: 0 }

// For a specific past month:
const lastMonth = await TenantUsageService.getUsage(tenantId, '2026-04');
```

`getUsage` reads from Redis first and falls back to the DB when Redis has no data (e.g. after a restart or for historical months).

## Flushing to the database

Call `flushToDb` from a CRON job (e.g. hourly) to persist counters durably:

```typescript
// In a CRON handler:
const month = TenantUsageService.currentMonth();
await TenantUsageService.flushToDb(tenantId, month);
```

`flushToDb` reads all 4 Redis counters and upserts the `TenantUsage` row for the given tenant+month. If all counters are zero, it skips the DB write.

## Entity registration

`TenantUsage` must be added to the tenant DataSource entity list separately (out of scope here). See `libs/typeorm/tenant.ts`.
