# ADR 0006 — Observability stack: Sentry + Prometheus, OTel optional, AsyncLocalStorage context

**Status:** Accepted (2026-05)

## Context

The boilerplate runs in multi-tenant production with per-tenant provider credentials, per-tenant rate limits, and per-tenant feature gating. When something breaks we need to answer "which tenant?" / "which user?" / "what was the upstream provider's response?" in seconds — not by grepping log files for half-remembered error strings.

Three observability primitives are non-negotiable for a production SaaS:

1. **Error sink** with per-tenant tags (Sentry / Rollbar / Bugsnag).
2. **Metrics** scraped by Prometheus or compatible (request rate, latency histogram, error rate, per-tenant usage).
3. **Distributed traces** so a slow `/api/ai/chat` call can be attributed to the OpenAI roundtrip vs. the DB query.

Without these, the platform's "did this tenant's Stripe webhook fail because of OUR bug or THEIR webhook handler?" question is unanswerable.

## Decision

Three independent backends, behind one facade, all **lazy + optional**:

- **Sentry** (`@sentry/nextjs`) for errors + traces. Enabled by `SENTRY_DSN`.
- **Prometheus** (`prom-client`) for metrics. Enabled by `METRICS_ENABLED=true`.
- **OpenTelemetry** SDK (`@opentelemetry/sdk-node`) for distributed traces. Enabled by `OTEL_ENABLED=true` (slot reserved; OSS pulls Sentry traces by default).

The facade is [`modules/observability/ObservabilityService`](../../modules/observability/observability.service.ts):

- `init()` boots whichever backends are configured.
- `setTags({ tenantId, userId, requestId })` enriches Sentry scope.
- `recordHttpRequest(...)` bumps the request counter + latency histogram.
- `recordError(err, opts)` captures to Sentry + bumps the error counter.
- `recordTenantUsage(...)` bumps the per-tenant gauge.
- `getMetricsRegistry()` exposes the prom registry for the scrape endpoint.

Tenant / user / request context is propagated via Node's `AsyncLocalStorage` — already in [`modules/logger/logger.service.ts`](../../modules/logger/logger.service.ts) via `Logger.runWithContext()` / `Logger.getContext()`. Both Sentry's `beforeSend` hook and `ObservabilityService.recordError()` pull from there, so the call site never threads tenantId manually.

Routes opt into observability via the Next-layer wrapper:

```ts
import { withObservability } from '@/modules_next/observability';

export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return withObservability(req, async () => { /* … */ }, { tenantId, route: '/api/tenant/[tenantId]/api/health' });
}
```

Three Kubernetes-style endpoints expose the stack:

| Endpoint | Purpose |
|---|---|
| `/api/internal/health` | Liveness probe — process up? |
| `/api/internal/ready` | Readiness probe — system DB + tenant DB + Redis up? |
| `/api/internal/metrics` | Prometheus scrape (Bearer `METRICS_SECRET` when set) |

These live at `/api/internal/*` — explicitly excluded from the proxy's tenant-rewrite layer so a load balancer / scraper can reach them without resolving a tenant.

The Next.js [`instrumentation.ts`](../../instrumentation.ts) hook at the repo root boots Sentry + Prometheus on server startup and (when `ENABLE_BACKGROUND_JOBS=true`) registers BullMQ recurring jobs for the five built-in cron schedulers.

## Consequences

**Positive**
- Zero runtime cost for operators who don't opt in — `import '@sentry/nextjs'` only happens when `SENTRY_DSN` is set, so the package can be left uninstalled in dev.
- Every Sentry event, log line, and metric automatically carries `tenantId` / `userId` / `requestId` without service-layer plumbing.
- Liveness vs readiness split lets k8s pull a pod out of rotation when Redis dies without killing the process (it self-heals when Redis comes back).
- Background-job scheduling becomes a single env flag (`ENABLE_BACKGROUND_JOBS=true`) — serverless deploys flip it off and use the existing HTTP cron endpoints under `/api/tenant/{ROOT}/api/cron/*`.

**Negative**
- Two SDKs (Sentry + prom-client) to keep updated when an operator opts in. Mitigated: typed via loose `any` runtime types so upgrading the SDK can't break compile.
- Sentry traces overlap with OpenTelemetry traces if both are enabled. Resolution: pick one. Sentry wins for the boilerplate default; OTel slot left for operators wired to Honeycomb / Tempo / Jaeger.
- `recordHttpRequest` allocates per-request labels. At very high RPS this is measurable. Mitigated: prom-client uses string interning under the hood; the cost is dominated by network I/O.

## Alternatives considered

- **OpenTelemetry only** (vendor-neutral). Rejected for v1: Sentry's error UI is significantly better than any OTLP-only sink, and operators almost always pair OTel with a vendor (Honeycomb / Datadog) anyway — so we'd pay the OTel cost AND vendor's cost.
- **Custom log-pattern observability** (parse winston logs into metrics). Rejected: Prometheus pull model is the operational standard, custom pipelines are toil.
- **DataDog APM**. Rejected as default — vendor lock-in. Operators can wire DataDog OpenTelemetry exporter via the `OTEL_*` env vars.
