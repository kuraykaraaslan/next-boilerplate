/**
 * Observability facade — single entry point that callers use without knowing
 * whether Sentry, Prometheus, or OTel is wired up. Every method is a no-op
 * when the relevant backend isn't initialised.
 *
 * The Logger AsyncLocalStorage context ([modules/logger]) is the source of
 * truth for the active tenantId/userId/requestId — both `setTags()` and
 * `recordError()` enrich their payload from there.
 */
import Logger from '@nb/logger';
import { initSentry, getSentry } from './sentry.init';
import { initMetrics, getMetrics } from './metrics';
import { initOtel } from './otel.init';
import type {
  HttpRequestSample,
  ObservabilityTags,
  RecordErrorOptions,
  TenantUsageSample,
} from './observability.types';

export default class ObservabilityService {
  private static _initStarted = false;

  // ── Label-cardinality guard ────────────────────────────────────────────
  // Prometheus time-series count multiplies per distinct label value. An
  // unbounded `tenantId` label (thousands of tenants) explodes memory. We cap
  // the number of distinct tenant labels; overflow collapses to `other`.
  private static readonly _MAX_TENANT_LABELS = 2000;
  private static readonly _seenTenantLabels = new Set<string>();

  /** Bound the tenantId label to a safe cardinality. */
  static boundTenantLabel(tenantId: string | null | undefined): string {
    if (!tenantId) return 'none';
    const id = String(tenantId);
    if (ObservabilityService._seenTenantLabels.has(id)) return id;
    if (ObservabilityService._seenTenantLabels.size >= ObservabilityService._MAX_TENANT_LABELS) return 'other';
    ObservabilityService._seenTenantLabels.add(id);
    return id;
  }

  // ── PII redaction ──────────────────────────────────────────────────────
  // Sentry `extra` is forwarded to a third-party processor; scrub obvious PII /
  // secrets so they never leave the platform, even if a caller is careless.
  private static readonly _PII_KEY = /pass|secret|token|authorization|cookie|api[-_]?key|email|phone|ssn|card|cvv|iban|otp|seed|private[-_]?key/i;
  private static readonly _EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

  /** Redact PII/secret values from an `extra` bag before it reaches Sentry. */
  static redactExtra(extra: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(extra)) {
      if (ObservabilityService._PII_KEY.test(k)) { out[k] = '[redacted]'; continue; }
      out[k] = typeof v === 'string' ? v.replace(ObservabilityService._EMAIL_RE, '[email]') : v;
    }
    return out;
  }

  /**
   * Boot Sentry + Prometheus. Safe to call repeatedly — first call wins.
   * Called from `instrumentation.ts` (Next.js server boot) and from tests
   * that want to assert behaviour with backends enabled.
   */
  static async init(): Promise<void> {
    if (ObservabilityService._initStarted) return;
    ObservabilityService._initStarted = true;
    await Promise.all([initSentry(), initMetrics(), initOtel()]);
  }

  /**
   * Attach tenantId / userId / requestId to the current Sentry scope. Pulled
   * from Logger context when the caller omits them.
   */
  static setTags(tags: ObservabilityTags): void {
    const sentry = getSentry();
    if (!sentry) return;
    const ctx = Logger.getContext();
    const effective = { ...ctx, ...tags };
    sentry.withScope((scope: any) => {
      if (effective.tenantId) scope.setTag('tenantId', String(effective.tenantId));
      if (effective.requestId) scope.setTag('requestId', String(effective.requestId));
      if (effective.userId) scope.setUser({ id: String(effective.userId) });
    });
  }

  /**
   * Record an HTTP request observation. Bumps the request counter and the
   * latency histogram. No-op when metrics aren't initialised.
   */
  static recordHttpRequest(sample: HttpRequestSample): void {
    const m = getMetrics();
    if (!m) return;
    // `route` and `metric` values must stay low-cardinality (typed HttpRequestSample
    // enforces this today). If a non-trusted caller is ever introduced, bound these
    // to a known set before passing to Prometheus to prevent label-cardinality blowup.
    const labels = {
      method: sample.method,
      route: sample.route,
      status: String(sample.status),
      tenantId: ObservabilityService.boundTenantLabel(sample.tenantId),
    };
    m.httpRequests.inc(labels);
    m.httpDuration.observe(labels, sample.latencyMs / 1000);
  }

  /**
   * Capture an error to Sentry and bump the error counter. Tenant + user
   * context is pulled from Logger ALS unless overridden in `opts`.
   */
  static recordError(err: Error, opts: RecordErrorOptions = {}): void {
    const sentry = getSentry();
    if (sentry) {
      sentry.withScope((scope: any) => {
        const ctx = Logger.getContext();
        const tenantId = opts.tenantId ?? ctx.tenantId;
        const userId = opts.userId ?? ctx.userId;
        if (tenantId) scope.setTag('tenantId', String(tenantId));
        if (userId) scope.setUser({ id: String(userId) });
        if (opts.fingerprint) scope.setFingerprint(opts.fingerprint);
        if (opts.level) scope.setLevel(opts.level);
        // Defense-in-depth: PII/secret keys and emails are redacted before send.
        if (opts.extra) Object.entries(ObservabilityService.redactExtra(opts.extra)).forEach(([k, v]) => scope.setExtra(k, v));
        sentry.captureException(err);
      });
    }
    const m = getMetrics();
    if (m) {
      const tenantId = opts.tenantId ?? Logger.getContext().tenantId;
      m.errors.inc({ tenantId: ObservabilityService.boundTenantLabel(tenantId as string | undefined), errorClass: err.constructor.name });
    }
  }

  /**
   * Record per-tenant usage on the Prometheus counter. Persistence still
   * lives in `TenantUsageService` — this is for real-time observability
   * dashboards (Grafana) not billing reconciliation.
   */
  static recordTenantUsage(sample: TenantUsageSample): void {
    const m = getMetrics();
    if (!m) return;
    m.tenantUsage.inc({ tenantId: ObservabilityService.boundTenantLabel(sample.tenantId), metric: sample.metric }, sample.value);
  }

  /** Count a rate-limit rejection for Grafana/alerting. Best-effort. */
  static recordRateLimitHit(scope: string, tenantId?: string | null): void {
    const m = getMetrics();
    if (!m) return;
    m.rateLimitHits.inc({ scope, tenantId: ObservabilityService.boundTenantLabel(tenantId) });
  }

  /**
   * Return the Prometheus registry for the scrape endpoint. `null` when
   * METRICS_ENABLED is off.
   */
  static getMetricsRegistry() {
    return getMetrics()?.registry ?? null;
  }

  /**
   * Flush in-flight Sentry events. Useful at process shutdown.
   */
  static async flush(timeoutMs = 2000): Promise<void> {
    const sentry = getSentry();
    if (!sentry) return;
    try {
      await sentry.flush(timeoutMs);
    } catch {
      // best effort — don't crash shutdown on Sentry's own failure
    }
  }
}
