import { getDataSource } from './db';
import { TenantDatabase } from './entities/tenant_database.entity';
import Logger from '@/modules/logger';

export interface TenantDbProvisionOptions {
  tenantId: string;
  databaseUrl: string;
  region?: string;
}

export default class TenantDatabaseService {

  static async provision(opts: TenantDbProvisionOptions): Promise<TenantDatabase> {
    const ds = await getDataSource();
    const repo = ds.getRepository(TenantDatabase);

    const existing = await repo.findOne({ where: { tenantId: opts.tenantId } });
    if (existing) return existing;

    const row = repo.create({ tenantId: opts.tenantId, databaseUrl: opts.databaseUrl });
    const saved = await repo.save(row);
    Logger.info(`TenantDatabaseService: provisioned DB for tenant ${opts.tenantId} region=${opts.region ?? 'default'}`);
    return saved;
  }

  static async decommission(tenantId: string): Promise<void> {
    const ds = await getDataSource();
    await ds.getRepository(TenantDatabase).delete({ tenantId });
    // Clear cached DataSource so next request doesn't use stale connection.
    const { clearTenantDsCache } = await import('./db');
    clearTenantDsCache(tenantId);
    Logger.info(`TenantDatabaseService: decommissioned DB for tenant ${tenantId}`);
  }

  static async listAll(): Promise<TenantDatabase[]> {
    const ds = await getDataSource();
    return ds.getRepository(TenantDatabase).find();
  }

  static async getForTenant(tenantId: string): Promise<TenantDatabase | null> {
    const ds = await getDataSource();
    return ds.getRepository(TenantDatabase).findOne({ where: { tenantId } }) ?? null;
  }
}
