/**
 * Prometheus metrics lazy initialiser. The `prom-client` package is imported
 * only when `METRICS_ENABLED=true` — no runtime cost when off, and the boilerplate
 * compiles cleanly even without the dependency installed.
 *
 * Exposes four default metrics:
 *   - http_requests_total                (counter, labels: method, route, status, tenantId)
 *   - http_request_duration_seconds      (histogram, labels: method, route, status, tenantId)
 *   - errors_total                       (counter, labels: tenantId, errorClass)
 *   - tenant_usage_total                 (counter, labels: tenantId, metric)
 *
 * Scraped by `/internal/api/metrics`.
 */
import { env } from '@/modules/env';
import Logger from '@/modules/logger';

// Loose runtime-only types so we don't take a compile-time dep on `prom-client`.
// The actual package is `await import('prom-client')` below.
type AnyCounter = { inc: (labels: Record<string, string | number>, value?: number) => void };
type AnyHistogram = { observe: (labels: Record<string, string | number>, value: number) => void };
type AnyRegistry = {
  contentType: string;
  metrics: () => Promise<string>;
};

export interface MetricBundle {
  registry: AnyRegistry;
  httpRequests: AnyCounter;
  httpDuration: AnyHistogram;
  errors: AnyCounter;
  tenantUsage: AnyCounter;
  rateLimitHits: AnyCounter;
}

let _bundle: MetricBundle | null = null;
let _initialized = false;

export async function initMetrics(): Promise<MetricBundle | null> {
  if (_initialized) return _bundle;
  _initialized = true;

  if (!env.METRICS_ENABLED) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prom: any = await import('prom-client' as string);
    const registry = new prom.Registry();
    prom.collectDefaultMetrics({ register: registry, prefix: 'app_' });

    const httpRequests: AnyCounter = new prom.Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests received',
      labelNames: ['method', 'route', 'status', 'tenantId'],
      registers: [registry],
    });
    const httpDuration: AnyHistogram = new prom.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request latency',
      labelNames: ['method', 'route', 'status', 'tenantId'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [registry],
    });
    const errors: AnyCounter = new prom.Counter({
      name: 'errors_total',
      help: 'Application errors captured by ObservabilityService',
      labelNames: ['tenantId', 'errorClass'],
      registers: [registry],
    });
    const tenantUsage: AnyCounter = new prom.Counter({
      name: 'tenant_usage_total',
      help: 'Per-tenant resource usage counter',
      labelNames: ['tenantId', 'metric'],
      registers: [registry],
    });
    const rateLimitHits: AnyCounter = new prom.Counter({
      name: 'rate_limit_hits_total',
      help: 'Rate-limit rejections by scope',
      labelNames: ['scope', 'tenantId'],
      registers: [registry],
    });

    _bundle = { registry, httpRequests, httpDuration, errors, tenantUsage, rateLimitHits };
    Logger.info('[observability] Prometheus registry initialised');
    return _bundle;
  } catch (err) {
    Logger.warn(
      `[observability] prom-client not installed — METRICS_ENABLED=true but the package is missing. ` +
        `Install with: npm install prom-client. ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

export function getMetrics(): MetricBundle | null {
  return _bundle;
}
