import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '@kuraykaraaslan/env';
import { parseDbUrl, typeormLogging, TenantContextLogger } from './db.utils';
import { ENTITIES } from './db.entities';

const { url: DEFAULT_DB_URL, schema: DEFAULT_SCHEMA } = parseDbUrl(env.DATABASE_URL);

// Direct (unpooled) connection for DDL: dev schema synchronize, migrations and
// heavy cross-tenant system jobs. PgBouncer / Neon *pooled* connections are
// transaction-scoped and unsuited to long DDL sessions, so prefer a dedicated
// direct URL when one is configured.
const HAS_UNPOOLED = !!env.DATABASE_URL_UNPOOLED && env.DATABASE_URL_UNPOOLED !== env.DATABASE_URL;
const { url: UNPOOLED_DB_URL, schema: UNPOOLED_SCHEMA } = parseDbUrl(env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL);

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

const defaultDataSource = new DataSource({
  ...buildDataSourceOptions(DEFAULT_DB_URL, DEFAULT_SCHEMA),
  // With a dedicated unpooled URL, schema sync runs over it (see getDataSource);
  // the pooled runtime connection then only serves queries.
  synchronize: HAS_UNPOOLED ? false : env.NODE_ENV === 'development',
});

let defaultInitialized = false;

export async function getDataSource(): Promise<DataSource> {
  if (!defaultInitialized) {
    await defaultDataSource.initialize();
    // Run dev auto-sync over the direct connection rather than the pooler.
    if (HAS_UNPOOLED && env.NODE_ENV === 'development') {
      await synchronizeViaUnpooled();
    }
    defaultInitialized = true;
  }
  return defaultDataSource;
}

// Apply `synchronize` over a short-lived direct connection, then drop it —
// keeps DDL off the pooled connection while preserving dev auto-sync.
async function synchronizeViaUnpooled(): Promise<void> {
  const ds = new DataSource({
    ...buildDataSourceOptions(UNPOOLED_DB_URL, UNPOOLED_SCHEMA),
    synchronize: false,
  });
  await ds.initialize();
  try {
    await ds.synchronize();
  } finally {
    await ds.destroy();
  }
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
// Prefers the direct (unpooled) connection when configured so heavy cross-tenant
// jobs don't consume pooled slots; otherwise reuses the default DataSource.
// Callers must SET LOCAL app.bypass_rls = 'on' or use the BYPASSRLS Postgres role.
let systemDataSource: DataSource | null = null;
let systemInitialized = false;

export async function getSystemDataSource(): Promise<DataSource> {
  if (!HAS_UNPOOLED) return getDataSource();
  if (!systemInitialized) {
    systemDataSource = new DataSource({
      ...buildDataSourceOptions(UNPOOLED_DB_URL, UNPOOLED_SCHEMA),
      synchronize: false,
    });
    await systemDataSource.initialize();
    systemInitialized = true;
  }
  return systemDataSource!;
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
