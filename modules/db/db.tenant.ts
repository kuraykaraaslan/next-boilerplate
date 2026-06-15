import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { parseDbUrl } from './db.utils';
import { TenantDatabase } from './entities/tenant_database.entity';
import { getDataSource, buildDataSourceOptions } from './db.datasource';

// ── Per-tenant DataSource cache ─────────────────────────────────────────────
const MAX_CACHED = 100;
const tenantCache = new Map<string, DataSource>();

function evictOldest(): void {
  const [key, ds] = tenantCache.entries().next().value!;
  tenantCache.delete(key);
  ds.destroy().catch(() => {});
}

export async function tenantDataSourceFor(tenantId: string): Promise<DataSource> {
  if (tenantCache.has(tenantId)) return tenantCache.get(tenantId)!;

  const base = await getDataSource();
  const row = await base.getRepository(TenantDatabase).findOne({ where: { tenantId } });
  if (!row) return base;

  const { url, schema } = parseDbUrl(row.databaseUrl);
  if (tenantCache.size >= MAX_CACHED) evictOldest();

  const ds = new DataSource(buildDataSourceOptions(url, schema));
  await ds.initialize();
  tenantCache.set(tenantId, ds);
  return ds;
}

export function clearTenantDsCache(tenantId: string): void {
  const ds = tenantCache.get(tenantId);
  tenantCache.delete(tenantId);
  ds?.destroy().catch(() => {});
}
