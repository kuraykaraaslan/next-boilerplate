import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '@/modules/env';
import { parseDbUrl, typeormLogging, TenantContextLogger } from './db.utils';
import { ENTITIES } from './db.entities';

const { url: DEFAULT_DB_URL, schema: DEFAULT_SCHEMA } = parseDbUrl(env.DATABASE_URL);

export function buildDataSourceOptions(url: string, schema?: string): ConstructorParameters<typeof DataSource>[0] {
  return {
    type: 'postgres',
    url,
    schema,
    synchronize: env.NODE_ENV === 'development',
    logging: typeormLogging(env.NODE_ENV),
    logger: new TenantContextLogger(env.DB_SLOW_QUERY_THRESHOLD_MS),
    entities: ENTITIES,
    migrations: ['modules/db/migrations/*.ts'],
    // PgBouncer-compatible pool sizing via DB_POOL_MAX env var.
    extra: { max: env.DB_POOL_MAX },
  };
}

const defaultDataSource = new DataSource(buildDataSourceOptions(DEFAULT_DB_URL, DEFAULT_SCHEMA));

let defaultInitialized = false;

export async function getDataSource(): Promise<DataSource> {
  if (!defaultInitialized) {
    await defaultDataSource.initialize();
    defaultInitialized = true;
  }
  return defaultDataSource;
}

// ── Read replica routing ────────────────────────────────────────────────────
let readDataSource: DataSource | null = null;
let readInitialized = false;

export async function getReadDataSource(): Promise<DataSource> {
  if (!env.DATABASE_READ_REPLICA_URL) return getDataSource();
  if (!readInitialized) {
    const { url, schema } = parseDbUrl(env.DATABASE_READ_REPLICA_URL);
    readDataSource = new DataSource({
      ...buildDataSourceOptions(url, schema),
      synchronize: false,
    });
    await readDataSource.initialize();
    readInitialized = true;
  }
  return readDataSource!;
}

// ── System DataSource (bypasses RLS for cross-tenant cron / migrations) ─────
// Uses the default DataSource connection; callers must SET LOCAL app.bypass_rls = 'on'
// or use the BYPASSRLS Postgres role. This is a typed marker for grep/audit.
export async function getSystemDataSource(): Promise<DataSource> {
  return getDataSource();
}

// ── Health check ────────────────────────────────────────────────────────────
export async function checkDataSourceHealth(): Promise<{
  default: 'ok' | 'error';
  replica: 'ok' | 'error' | 'not_configured';
  error?: string;
}> {
  let defaultStatus: 'ok' | 'error' = 'error';
  let replicaStatus: 'ok' | 'error' | 'not_configured' = 'not_configured';
  let errorMsg: string | undefined;

  try {
    const ds = await getDataSource();
    await ds.query('SELECT 1');
    defaultStatus = 'ok';
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  if (env.DATABASE_READ_REPLICA_URL) {
    try {
      const ds = await getReadDataSource();
      await ds.query('SELECT 1');
      replicaStatus = 'ok';
    } catch {
      replicaStatus = 'error';
    }
  }

  return { default: defaultStatus, replica: replicaStatus, ...(errorMsg ? { error: errorMsg } : {}) };
}
