# Observability

- **id:** `observability`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/observability/`
- **tags:** observability, infra, core
- **icon:** `fas fa-chart-line`
- **hasNextLayer:** true

Sentry + Prometheus + OTel facade. Auto-tags every log/trace/metric with the active tenantId/userId/requestId via Logger AsyncLocalStorage context. Lazy-loaded — no-op when SENTRY_DSN / METRICS_ENABLED / OTEL_ENABLED are unset.

## Dependencies

- **requires:** `env`, `logger`

## Services

- `observability.service.ts`

## Next layer (modules_next/) surface

- `observability/index` _(ui)_
- `observability/withObservability.next` _(ui)_

## README

# observability

Single-facade entry point for Sentry (error + trace sink), Prometheus (metrics scrape), and OpenTelemetry (distributed tracing). Every call automatically inherits the active `tenantId` / `userId` / `requestId` from the [Logger](../logger/) AsyncLocalStorage context — service code never threads observability metadata manually.

The module is **lazy** — when an env toggle is off (`SENTRY_DSN` unset, `METRICS_ENABLED=false`, `OTEL_ENABLED=false`), nothing is imported and every method is a no-op. Operators pay zero runtime cost until they opt in.

---

## Public API

| Method | Use |
|---|---|
| `ObservabilityService.init()` | Boot Sentry + Prometheus. Called from `instrumentation.ts` at Next.js startup. |
| `ObservabilityService.setTags({ tenantId?, userId?, requestId? })` | Attach context to the current Sentry scope. |
| `ObservabilityService.recordHttpRequest({ tenantId, route, method, status, latencyMs })` | Bump the request counter + latency histogram. Called by `withObservability()`. |
| `ObservabilityService.recordError(err, { tenantId?, userId?, fingerprint?, level?, extra? })` | Capture to Sentry + bump the error counter. |
| `ObservabilityService.recordTenantUsage({ tenantId, metric, value })` | Per-tenant counter — feeds Grafana dashboards. Persistence still goes through `TenantUsageService`. |
| `ObservabilityService.getMetricsRegistry()` | Prom registry for the scrape endpoint. `null` when METRICS_ENABLED is off. |
| `ObservabilityService.flush(timeoutMs?)` | Wait for in-flight Sentry events to ship — call at shutdown. |

The Next-layer wrapper is in [modules_next/observability/withObservability.next.ts](../../modules_next/observability/withObservability.next.ts):

```ts
import { withObservability } from '@/modules_next/observability';

export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  return withObservability(request, async () => {
    // … route logic — Logger context, Sentry tags, and Prometheus metrics
    // are all set automatically.
  }, { route: '/api/tenant/[tenantId]/api/health' });
}
```

---

## Environment

| Var | Default | Effect |
|---|---|---|
| `SENTRY_DSN` | — | When set, Sentry is initialised. Errors and traces ship. |
| `SENTRY_ENVIRONMENT` | `NODE_ENV` | Sentry environment tag. |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.1` | Fraction of requests to trace. |
| `SENTRY_PROFILES_SAMPLE_RATE` | `0` | Fraction to profile. |
| `METRICS_ENABLED` | `false` | When `true`, `/api/internal/metrics` returns Prometheus text. |
| `METRICS_SECRET` | — | Optional bearer token required on `/api/internal/metrics`. |
| `OTEL_ENABLED` | `false` | Reserved for OTel SDK init (see below). |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTLP collector URL. |
| `OTEL_SERVICE_NAME` | `next-boilerplate` | OTel resource service.name. |
| `APPLICATION_VERSION` | `dev` | Surfaced in health + every Sentry event's `release`. |

---

## Installation

The boilerplate ships with the facade only — install the backend SDKs when you opt in:

```bash
# Sentry
npm install @sentry/nextjs

# Prometheus
npm install prom-client

# OpenTelemetry (optional)
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

When env toggles are on but the package is missing, the facade logs a warning at boot and stays no-op — the app never crashes for a missing observability dep.

---

## Rules

- **No `next/*`, no `react`.** Service-layer only.
- **Logger context is the source of truth** for tenantId/userId/requestId. Don't thread them manually unless overriding.
- **Backends are optional.** Code that imports `ObservabilityService` works without Sentry or prom-client installed.
- **`recordError` doesn't re-throw** — caller decides whether to surface the error to the response.
