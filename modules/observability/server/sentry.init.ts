/**
 * Sentry lazy initialiser. The `@sentry/nextjs` package is imported only
 * when `SENTRY_DSN` is set — the boilerplate ships zero observability
 * runtime cost for operators who don't opt in, and compiles cleanly even
 * without the dependency installed.
 *
 * Loaded by `instrumentation.ts` (Next.js server boot) and exposes the live
 * Sentry namespace through `getSentry()` for the rest of the module to use.
 */
import { env } from '@nb/env';
import Logger from '@nb/logger';

// Loose runtime-only type; actual package is `await import('@sentry/nextjs')`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SentryNamespace = any;

let _sentry: SentryNamespace | null = null;
let _initialized = false;

export async function initSentry(): Promise<SentryNamespace | null> {
  if (_initialized) return _sentry;
  _initialized = true;

  if (!env.SENTRY_DSN) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import('@sentry/nextjs' as string);
    mod.init({
      dsn: env.SENTRY_DSN,
      environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
      release: env.APPLICATION_VERSION,
      tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
      profilesSampleRate: env.SENTRY_PROFILES_SAMPLE_RATE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      beforeSend(event: any) {
        // Pull tenantId/userId/requestId from Logger AsyncLocalStorage if the
        // current async chain has one set — auto-tag every event without
        // touching call sites.
        const ctx = Logger.getContext();
        if (ctx.tenantId) event.tags = { ...(event.tags ?? {}), tenantId: String(ctx.tenantId) };
        if (ctx.userId) event.user = { ...(event.user ?? {}), id: String(ctx.userId) };
        if (ctx.requestId) event.tags = { ...(event.tags ?? {}), requestId: String(ctx.requestId) };
        return event;
      },
    });
    _sentry = mod;
    Logger.info('[observability] Sentry initialised');
    return mod;
  } catch (err) {
    Logger.warn(
      `[observability] @sentry/nextjs not installed — SENTRY_DSN set but the SDK is missing. ` +
        `Install with: npm install @sentry/nextjs. ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

export function getSentry(): SentryNamespace | null {
  return _sentry;
}
