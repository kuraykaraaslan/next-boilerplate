import winston from 'winston';
import { AsyncLocalStorage } from 'node:async_hooks';
import { env } from '@/modules/env';

const { combine, timestamp, json, printf } = winston.format;
const timestampFormat = 'MMM-DD-YYYY HH:mm:ss';

/**
 * Per-request context that automatically tags every Logger.info/warn/error
 * call with the active tenant + user + request IDs. Populated by the proxy
 * (or route handler) via `Logger.runWithContext({ ... }, fn)`; downstream
 * code that calls `Logger.info(...)` has no knowledge of context propagation.
 */
export interface LogContext {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  [k: string]: string | number | boolean | undefined;
}

const contextStore = new AsyncLocalStorage<LogContext>();

function currentContext(): LogContext {
  return contextStore.getStore() ?? {};
}

// Serverless platforms (Vercel, AWS Lambda) and the edge runtime expose a
// read-only filesystem (only /tmp is writable), so winston's File transport
// crashes at construction trying to mkdir `logs/`. Detect those and log to the
// console instead — which is also what their log drains ingest.
function isServerless(): boolean {
  return !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NEXT_RUNTIME === 'edge'
  );
}

function makeTransports(level: string) {
  if (env.NODE_ENV === 'vercel' || env.NODE_ENV === 'development' || isServerless()) {
    return [new winston.transports.Console()];
  }
  return [
    new winston.transports.File({
      filename: 'logs/' + new Date().toISOString().split('T')[0] + '.log',
      level,
    }),
  ];
}

// Structured-JSON output when LOG_FORMAT=json (machine ingestion / cloud log
// pipelines); otherwise the human-readable single-line format.
const JSON_FORMAT = process.env.LOG_FORMAT === 'json';

// Info-log sampling under high load: LOG_SAMPLE_RATE in (0,1) keeps that
// fraction of info logs; warn/error are never sampled.
const SAMPLE_RATE = (() => {
  const n = Number(process.env.LOG_SAMPLE_RATE);
  return Number.isFinite(n) && n > 0 && n < 1 ? n : 1;
})();

function makeLogger(level: string) {
  return winston.createLogger({
    level,
    format: combine(
      timestamp({ format: timestampFormat }),
      json(),
      printf(({ level: l, message, timestamp: ts }) => {
        const ctx = currentContext();
        if (JSON_FORMAT) {
          return JSON.stringify({
            ts, level: l, message,
            ...(ctx.tenantId ? { tenantId: ctx.tenantId } : {}),
            ...(ctx.userId ? { userId: ctx.userId } : {}),
            ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
          });
        }
        const tags: string[] = [];
        if (ctx.tenantId) tags.push(`tenant=${ctx.tenantId}`);
        if (ctx.userId) tags.push(`user=${ctx.userId}`);
        if (ctx.requestId) tags.push(`req=${ctx.requestId}`);
        const tagStr = tags.length ? ` [${tags.join(' ')}]` : '';
        return `[${ts}] [${l}]${tagStr}: ${message}`;
      }),
    ),
    transports: makeTransports(level),
  });
}

// Mutable so the app can expand the denylist at boot (env LOG_REDACT_KEYS or
// per-tenant security settings) without editing this file.
const REDACTED_KEYS = new Set([
  'password', 'token', 'secret', 'authorization', 'apiKey', 'api_key',
  'accessToken', 'refreshToken', 'privateKey', 'creditCard', 'cvv', 'ssn',
]);
for (const k of (process.env.LOG_REDACT_KEYS ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
  REDACTED_KEYS.add(k);
}

// Value-level (pattern) redaction — catches PII/secrets that slip through as
// plain string values regardless of their key name.
const VALUE_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, label: '[JWT]' },
  { re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, label: '[EMAIL]' },
  { re: /\b(?:\d[ -]?){13,19}\b/g, label: '[CARD]' },
  { re: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g, label: '[IBAN]' },
];
function redactString(s: string): string {
  let out = s;
  for (const { re, label } of VALUE_PATTERNS) out = out.replace(re, label);
  return out;
}

// Tenants with temporarily-elevated (debug) logging, set at runtime.
const elevatedTenants = new Set<string>();
const GLOBAL_DEBUG = (process.env.LOG_LEVEL ?? '').toLowerCase() === 'debug';

const MAX_REDACT_DEPTH = 10;
const MAX_REDACT_KEYS = 2_000;

export default class Logger {
  private static infoLogger = makeLogger('info');
  private static errorLogger = makeLogger('error');
  private static warnLogger = makeLogger('warn');

  /**
   * Recursively walk `obj` and replace the values of any keys that match the
   * sensitive-key list with `"[REDACTED]"`. Caps at MAX_REDACT_DEPTH levels
   * deep and bails out early once MAX_REDACT_KEYS total keys have been visited
   * to prevent DoS on unexpectedly large payloads.
   */
  private static redact(obj: unknown, depth = 0): unknown {
    if (depth > MAX_REDACT_DEPTH) return obj;
    if (Array.isArray(obj)) {
      return obj.map((item) => Logger.redact(item, depth + 1));
    }
    if (obj !== null && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      let keyCount = 0;
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (++keyCount > MAX_REDACT_KEYS) break;
        result[k] = REDACTED_KEYS.has(k) ? '[REDACTED]' : Logger.redact(v, depth + 1);
      }
      return result;
    }
    if (typeof obj === 'string') return redactString(obj);
    return obj;
  }

  private static serialize(...args: unknown[]): string {
    return args
      .map(a => (typeof a === 'object' && a !== null ? JSON.stringify(Logger.redact(a)) : redactString(String(a))))
      .join(' ');
  }

  /** Expand the key-name redaction denylist at boot (env / tenant settings). */
  static addRedactKeys(keys: string[]): void {
    for (const k of keys) if (k) REDACTED_KEYS.add(k);
  }

  /** Temporarily elevate (or reset) debug logging for a single tenant. */
  static setTenantDebug(tenantId: string, on: boolean): void {
    if (on) elevatedTenants.add(tenantId); else elevatedTenants.delete(tenantId);
  }

  /**
   * Run `fn` inside a logging context — every Logger.X call made by `fn` or
   * anything it awaits will automatically include the context tags.
   *
   *   Logger.runWithContext({ tenantId, userId, requestId }, async () => {
   *     await doStuff(); // logs inside automatically tagged
   *   });
   */
  static runWithContext<T>(ctx: LogContext, fn: () => T): T {
    const merged = { ...currentContext(), ...ctx };
    return contextStore.run(merged, fn);
  }

  static getContext(): LogContext {
    return { ...currentContext() };
  }

  static info(message: string, ...args: unknown[]) {
    // Sampling under high load — drop a fraction of info logs (never warn/error).
    // Elevated tenants always log in full.
    if (SAMPLE_RATE < 1 && !elevatedTenants.has(currentContext().tenantId ?? '') && Math.random() > SAMPLE_RATE) return;
    Logger.infoLogger.info(args.length > 0 ? `${message} ${Logger.serialize(...args)}` : redactString(message));
  }

  static error(message: string, ...args: unknown[]) {
    Logger.errorLogger.error(args.length > 0 ? `${message} ${Logger.serialize(...args)}` : message);
  }

  static warn(message: string, ...args: unknown[]) {
    Logger.warnLogger.warn(args.length > 0 ? `${message} ${Logger.serialize(...args)}` : message);
  }

  static debug(message: string, ...args: unknown[]) {
    // Only emit debug when globally enabled or the active tenant is elevated —
    // keeps normal operation quiet while allowing targeted per-tenant tracing.
    if (!GLOBAL_DEBUG && !elevatedTenants.has(currentContext().tenantId ?? '')) return;
    const msg = args.length > 0 ? `[DEBUG] ${message} ${Logger.serialize(...args)}` : `[DEBUG] ${redactString(message)}`;
    Logger.infoLogger.info(msg);
  }
}
