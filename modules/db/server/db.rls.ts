import 'reflect-metadata';
import { getDataSource } from './db.datasource';
import { tenantDataSourceFor } from './db.tenant';

/**
 * Apply a per-statement timeout for the duration of `callback`.
 * Uses `SET LOCAL statement_timeout` so the timeout is transaction-scoped.
 * When DB_QUERY_TIMEOUT_MS is 0 (default) the call is a no-op pass-through.
 */
export async function withQueryTimeout<T>(
  tenantId: string,
  timeoutMs: number,
  callback: (qr: import('typeorm').QueryRunner) => Promise<T>,
): Promise<T> {
  const ds = await tenantDataSourceFor(tenantId);
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    if (timeoutMs > 0) {
      await qr.query('SET LOCAL statement_timeout = $1', [timeoutMs]);
    }
    const result = await callback(qr);
    await qr.commitTransaction();
    return result;
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
  }
}

/**
 * Run `callback` inside a transaction with `SET LOCAL app.current_tenant`
 * applied so PostgreSQL RLS policies in migration 001_tenant_rls.sql are
 * enforced on the shared DataSource.  Use this for any query that touches
 * the default DataSource with tenant-scoped rows.
 *
 * Per-tenant DataSources (separate DB per tenant) already provide isolation
 * at the database level and do not need this wrapper.
 */
export async function withTenantRLS<T>(
  tenantId: string,
  callback: (qr: import('typeorm').QueryRunner) => Promise<T>,
): Promise<T> {
  const ds = await getDataSource();
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    await qr.query('SET LOCAL app.current_tenant = $1', [tenantId]);
    const result = await callback(qr);
    await qr.commitTransaction();
    return result;
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
  }
}

/**
 * Run `callback` with RLS bypassed for cross-tenant system operations
 * (GDPR sweeps, cron jobs, migrations). Uses SET LOCAL so bypass is
 * transaction-scoped and cannot leak to other queries.
 */
export async function withSystemRLS<T>(
  callback: (qr: import('typeorm').QueryRunner) => Promise<T>,
): Promise<T> {
  const ds = await getDataSource();
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    await qr.query("SET LOCAL app.bypass_rls = 'on'");
    const result = await callback(qr);
    await qr.commitTransaction();
    return result;
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
  }
}
