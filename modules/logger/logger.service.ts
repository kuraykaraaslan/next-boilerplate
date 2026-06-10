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

function makeTransports(level: string) {
  if (env.NODE_ENV === 'vercel' || env.NODE_ENV === 'development') {
    return [new winston.transports.Console()];
  }
  return [
    new winston.transports.File({
      filename: 'logs/' + new Date().toISOString().split('T')[0] + '.log',
      level,
    }),
  ];
}

function makeLogger(level: string) {
  return winston.createLogger({
    level,
    format: combine(
      timestamp({ format: timestampFormat }),
      json(),
      printf(({ level: l, message, timestamp: ts }) => {
        const ctx = currentContext();
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

const REDACTED_KEYS = new Set([
  'password', 'token', 'secret', 'authorization', 'apiKey', 'api_key',
  'accessToken', 'refreshToken', 'privateKey', 'creditCard', 'cvv', 'ssn',
]);

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
    return obj;
  }

  private static serialize(...args: unknown[]): string {
    return args
      .map(a => (typeof a === 'object' && a !== null ? JSON.stringify(Logger.redact(a)) : String(a)))
      .join(' ');
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
    Logger.infoLogger.info(args.length > 0 ? `${message} ${Logger.serialize(...args)}` : message);
  }

  static error(message: string, ...args: unknown[]) {
    Logger.errorLogger.error(args.length > 0 ? `${message} ${Logger.serialize(...args)}` : message);
  }

  static warn(message: string, ...args: unknown[]) {
    Logger.warnLogger.warn(args.length > 0 ? `${message} ${Logger.serialize(...args)}` : message);
  }

  static debug(message: string, ...args: unknown[]) {
    const msg = args.length > 0 ? `[DEBUG] ${message} ${Logger.serialize(...args)}` : `[DEBUG] ${message}`;
    Logger.infoLogger.info(msg);
  }
}
