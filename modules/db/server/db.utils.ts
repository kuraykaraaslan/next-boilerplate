import type { LoggerOptions, Logger as TypeOrmLogger, QueryRunner } from 'typeorm';
import { AsyncLocalStorage } from 'async_hooks';

export function parseDbUrl(raw: string): { url: string; schema?: string } {
  const match = raw.match(/[?&]schema=([^&]+)/);
  const schema = match?.[1];
  const url = raw.replace(/[?&]schema=[^&]+/, '').replace(/[?&]$/, '');
  return { url, schema };
}

export function typeormLogging(nodeEnv: string | undefined): LoggerOptions {
  if (process.env.TYPEORM_LOG_QUERIES === '1') return 'all';
  if (nodeEnv === 'development') return ['error', 'warn', 'schema', 'migration'];
  return ['error'];
}

// ── Tenant context for slow-query tagging ───────────────────────────────────
// Set this store before executing a query to have the tenantId appear in logs.
export const tenantQueryContext = new AsyncLocalStorage<{ tenantId: string }>();

// Custom TypeORM logger that tags slow queries (> threshold ms) with tenantId.
export class TenantContextLogger implements TypeOrmLogger {
  constructor(private readonly thresholdMs: number = 1000) {}

  logQuery(query: string, parameters?: unknown[]): void {}

  logQueryError(error: string | Error, query: string, parameters?: unknown[]): void {
    const msg = typeof error === 'string' ? error : error.message;
    console.error(`[db] query error: ${msg} — ${query}`);
  }

  logQuerySlow(time: number, query: string, parameters?: unknown[]): void {
    const ctx = tenantQueryContext.getStore();
    const tag = ctx ? `tenant=${ctx.tenantId}` : 'tenant=unknown';
    console.warn(`[db] slow query (${time}ms) [${tag}]: ${query.slice(0, 200)}`);
  }

  logSchemaBuild(message: string): void {
    console.info(`[db] schema: ${message}`);
  }

  logMigration(message: string): void {
    console.info(`[db] migration: ${message}`);
  }

  log(level: 'log' | 'info' | 'warn', message: unknown): void {
    if (level === 'warn') console.warn(`[db] ${message}`);
  }
}
