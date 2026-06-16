# Analytics

- **id:** `analytics`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/analytics/`
- **tags:** platform, analytics, events, metrics
- **icon:** `fas fa-chart-line`
- **hasNextLayer:** false

Tenant-scoped product analytics: append-only event tracking (page views, signups, custom events) plus aggregate reads — top-line summary (total events, unique users/sessions, top events), GROUP BY date_trunc timeseries with dense gap-filling, and top-events. Tracking works for anonymous visitors; summaries are short-cached in Redis. Distinct from metering (billing) and observability (ops metrics).

## Dependencies

- **requires:** `db`, `env`, `redis`, `common`

## Services

- `analytics.service.ts`

## DTOs

- `analytics.dto.ts`

## Entities

- `analytics_event.entity.ts`

## Enums

- `analytics.enums.ts`

## Message keys

- `analytics.messages.ts`

## TypeORM entities

- `AnalyticsEvent` (system) — `modules/analytics/server/entities/analytics_event.entity.ts`

## README

# analytics

Tenant-scoped **product analytics** — track behavioural events and read
aggregates over them (active users, top events, daily timeseries).
Framework-agnostic (`modules/` layer); the Next bindings (admin dashboard + API
routes) live under `app/` and `modules_next/`.

> Not to be confused with `metering` (usage-based **billing**) or
> `observability` (ops/infra metrics). This module is about *product behaviour*:
> what users do.

## What it does

A single append-only `AnalyticsEvent` row is written per tracked event. Reads are
pure aggregates over a date range:

- **summary** — `totalEvents`, `uniqueUsers` (COUNT DISTINCT userId),
  `uniqueSessions` (COUNT DISTINCT sessionId), and the top 10 events by count.
- **timeseries** — counts grouped by `date_trunc(interval, createdAt)`, returned
  as a **dense** series (missing buckets filled with `0`) for charts/tables.
- **topEvents** — the top N events by count.

Tracking works for **anonymous visitors** — every identity field is optional, so
a public page can post a `page_view` with only an `anonymousId`.

## Public API

```ts
import { AnalyticsService } from "@/modules/analytics";

// Track (await the save; safe to fire-and-forget at the route layer)
await AnalyticsService.track(tenantId, {
  name: "page_view",
  anonymousId,
  sessionId,
  path: "/pricing",
  referrer: document.referrer,
});

// Aggregates (from/to default to last 30 days → now)
const s  = await AnalyticsService.summary(tenantId, { from, to });
const ts = await AnalyticsService.timeseries(tenantId, { interval: "day", from, to });
const te = await AnalyticsService.topEvents(tenantId, { limit: 10 });
```

The pure timeseries gap-filler is exported for unit use:
`fillTimeseriesGaps(points, from, to, interval)` and `truncateToBucket(date, interval)`.

## Entities

| Entity | Table | Notes |
|---|---|---|
| `AnalyticsEvent` | `analytics_events` | Append-only (no `updatedAt`). Composite `(tenantId, name, createdAt)` index backs the aggregate queries; `properties` is `jsonb`. |

## Caching

`summary()` is cached in Redis under
`analytics:summary:{tenantId}:{fromMs}:{toMs}` (`TENANT_CACHE_TTL`, default 60s,
jittered), behind a single-flight to collapse concurrent misses.

## Dependencies

`db`, `env`, `redis`, `common`.

## HTTP surface

- `POST /tenant/{tenantId}/api/analytics/track` — track an event (soft auth: attaches `userId` if signed in, otherwise anonymous). Rate-limited.
- `GET /tenant/{tenantId}/api/analytics/summary` — top-line summary (admin).
- `GET /tenant/{tenantId}/api/analytics/timeseries` — dense daily/weekly/… series (admin).

Admin UI: `/tenant/{tenantId}/admin/analytics`.
