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

export default class Logger {
  private static infoLogger = makeLogger('info');
  private static errorLogger = makeLogger('error');
  private static warnLogger = makeLogger('warn');

  private static serialize(...args: any[]): string {
    return args
      .map(a => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)))
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

  static info(message: string, ...args: any[]) {
    Logger.infoLogger.info(args.length > 0 ? `${message} ${Logger.serialize(...args)}` : message);
  }

  static error(message: string, ...args: any[]) {
    Logger.errorLogger.error(args.length > 0 ? `${message} ${Logger.serialize(...args)}` : message);
  }

  static warn(message: string, ...args: any[]) {
    Logger.warnLogger.warn(args.length > 0 ? `${message} ${Logger.serialize(...args)}` : message);
  }

  static debug(message: string, ...args: any[]) {
    const msg = args.length > 0 ? `[DEBUG] ${message} ${Logger.serialize(...args)}` : `[DEBUG] ${message}`;
    Logger.infoLogger.info(msg);
  }
}
