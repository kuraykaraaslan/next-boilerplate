import 'reflect-metadata';
import { IsNull, LessThan } from 'typeorm';
import { tenantDataSourceFor, getDefaultTenantDataSource } from '@/modules/db';
import { Tenant } from './entities/tenant.entity';
import Logger from '@/modules/logger';

const DELETION_GRACE_DAYS = 30;

export default class TenantDeletionService {

  static async requestDeletion(tenantId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(Tenant);
    const tenant = await repo.findOne({ where: { tenantId } });
    if (!tenant) throw new Error('Tenant not found');

    const now = new Date();
    const deleteAfter = new Date(now);
    deleteAfter.setDate(deleteAfter.getDate() + DELETION_GRACE_DAYS);

    await repo.update({ tenantId }, {
      tenantStatus: 'PENDING_DELETION',
      deletionRequestedAt: now,
      deleteAfter,
    });
    Logger.info(`[TenantDeletion] Deletion requested for tenant ${tenantId}, scheduled for ${deleteAfter.toISOString()}`);
  }

  static async cancelDeletion(tenantId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(Tenant);
    await repo.update({ tenantId }, {
      tenantStatus: 'ACTIVE',
      deletionRequestedAt: null as unknown as undefined,
      deleteAfter: null as unknown as undefined,
    });
    Logger.info(`[TenantDeletion] Deletion cancelled for tenant ${tenantId}`);
  }

  static async purgeExpiredTenants(): Promise<number> {
    const ds = await getDefaultTenantDataSource();
    const repo = ds.getRepository(Tenant);
    const now = new Date();

    const toDelete = await repo.find({
      where: {
        tenantStatus: 'PENDING_DELETION',
        deleteAfter: LessThan(now),
        deletedAt: IsNull(),
      },
    });

    let purged = 0;
    for (const tenant of toDelete) {
      await repo.softRemove(tenant);
      purged++;
      Logger.info(`[TenantDeletion] Purged tenant ${tenant.tenantId}`);
    }
    return purged;
  }
}
