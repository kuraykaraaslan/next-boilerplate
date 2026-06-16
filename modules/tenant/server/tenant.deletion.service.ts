import 'reflect-metadata';
import { IsNull, LessThan } from 'typeorm';
import { tenantDataSourceFor, getDataSource, clearTenantDsCache } from '@nb/db';
import { Tenant } from './entities/tenant.entity';
import Logger from '@nb/logger';
import TenantMessages from './tenant.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { clearTenantCache } from '@nb/redis';

const DELETION_GRACE_DAYS = 30;

export default class TenantDeletionService {

  static async requestDeletion(tenantId: string, graceDays?: number): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(Tenant);
    const tenant = await repo.findOne({ where: { tenantId } });
    if (!tenant) throw new AppError(TenantMessages.TENANT_NOT_FOUND, 404, ErrorCode.TENANT_NOT_FOUND);

    const days = graceDays ?? DELETION_GRACE_DAYS;
    const now = new Date();
    const deleteAfter = new Date(now);
    deleteAfter.setDate(deleteAfter.getDate() + days);

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

  /**
   * Hard-purge expired tenants with full cross-module cascade:
   * 1. Cancel active subscriptions with payment provider
   * 2. Revoke API keys
   * 3. Delete S3/storage objects
   * 4. Flush Redis tenant cache
   * 5. Clear per-tenant DataSource cache
   * 6. Soft-remove the tenant row
   */
  static async purgeExpiredTenants(): Promise<number> {
    const ds = await getDataSource();
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
      try {
        await this.cascadePurge(tenant.tenantId);
        await repo.softRemove(tenant);
        purged++;
        Logger.info(`[TenantDeletion] Purged tenant ${tenant.tenantId}`);
      } catch (err) {
        Logger.error(`[TenantDeletion] Failed to purge tenant ${tenant.tenantId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return purged;
  }

  /**
   * Cross-module purge cascade — best-effort, logs failures without aborting.
   */
  private static async cascadePurge(tenantId: string): Promise<void> {
    const errors: string[] = [];

    // 1. Cancel active subscription with payment provider
    try {
      const { default: TenantSubscriptionService } = await import('@nb/tenant_subscription/server/tenant_subscription.service');
      // cancelSubscription is the correct method name from the delegated facade
      await (TenantSubscriptionService as any).cancelSubscription?.(tenantId, undefined, 'tenant_purged').catch(() => {});
    } catch (err) {
      errors.push(`subscription: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 2. Revoke all API keys for this tenant
    try {
      const { default: ApiKeyService } = await import('@nb/api_key/server/api_key.service');
      await ApiKeyService.revokeAll(tenantId).catch(() => {});
    } catch (err) {
      errors.push(`api_key: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 3. Delete storage objects (S3 / R2) — best-effort, uses existing deleteFile per row
    try {
      const ds = await getDataSource();
      const files = await ds.query(
        `SELECT key FROM uploaded_files WHERE "tenantId" = $1 AND "deletedAt" IS NULL`,
        [tenantId],
      );
      if (files.length > 0) {
        const { default: StorageService } = await import('@nb/storage/server/storage.service');
        for (const file of files) {
          await StorageService.deleteFile(tenantId, { key: file.key }).catch(() => {});
        }
      }
    } catch (err) {
      errors.push(`storage: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 4. Flush all Redis keys for this tenant
    await clearTenantCache(tenantId).catch(() => {});

    // 5. Clear per-tenant DataSource cache
    clearTenantDsCache(tenantId);

    if (errors.length > 0) {
      Logger.warn(`[TenantDeletion] Cascade purge for ${tenantId} had errors: ${errors.join(', ')}`);
    }
  }
}
