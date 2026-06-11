import 'reflect-metadata';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import { TenantSubscription as TenantSubscriptionEntity } from './entities/tenant_subscription.entity';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import Logger from '@/modules/logger';
import {
  TenantSubscriptionSchema,
  GracePeriodStatusSchema,
} from './tenant_subscription.types';
import type { TenantSubscription, GracePeriodStatus } from './tenant_subscription.types';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import TenantFeatureGateService from './tenant_subscription.feature.service';

export default class TenantSubscriptionGraceService {

  private static readonly GRACE_PERIOD_DAYS_DEFAULT = 7;

  private static async getGracePeriodDays(): Promise<number> {
    try {
      const SettingService = (await import('@/modules/setting/setting.service')).default;
      const val = await SettingService.getValue(ROOT_TENANT_ID, 'subscriptionGracePeriodDays');
      const parsed = val ? parseInt(val, 10) : NaN;
      return isNaN(parsed) || parsed < 0 ? TenantSubscriptionGraceService.GRACE_PERIOD_DAYS_DEFAULT : parsed;
    } catch {
      return TenantSubscriptionGraceService.GRACE_PERIOD_DAYS_DEFAULT;
    }
  }

  static async startGracePeriod(tenantId: string): Promise<TenantSubscription> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantSubscriptionEntity);
    const existing = await repo.findOne({ where: { tenantId } });
    if (!existing) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (existing.status !== 'PAST_DUE') throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_PAST_DUE, 409, ErrorCode.CONFLICT);

    const gracePeriodDays = await TenantSubscriptionGraceService.getGracePeriodDays();
    const gracePeriodEndsAt = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000);

    try {
      await repo.update({ tenantId }, { gracePeriodEndsAt } as any);
      const updated = await repo.findOne({ where: { tenantId } });
      await TenantFeatureGateService.invalidateFeatureCache(tenantId);
      Logger.info(`Grace period started for tenant ${tenantId} — ends ${gracePeriodEndsAt.toISOString()}`);
      return TenantSubscriptionSchema.parse(updated!);
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.GRACE_PERIOD_START_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof AppError) throw error;
      throw new AppError(SUBSCRIPTION_MESSAGES.GRACE_PERIOD_START_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async getGracePeriodStatus(tenantId: string): Promise<GracePeriodStatus> {
    const ds = await tenantDataSourceFor(tenantId);
    const sub = await ds.getRepository(TenantSubscriptionEntity).findOne({ where: { tenantId } });

    if (!sub || sub.status !== 'PAST_DUE' || !sub.gracePeriodEndsAt) {
      return GracePeriodStatusSchema.parse({ inGrace: false, gracePeriodEndsAt: null, daysRemaining: null });
    }

    const now = new Date();
    const endsAt = new Date(sub.gracePeriodEndsAt);
    const inGrace = endsAt > now;
    const daysRemaining = inGrace
      ? Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    return GracePeriodStatusSchema.parse({ inGrace, gracePeriodEndsAt: endsAt, daysRemaining });
  }

  static async expireOverdueSubscriptions(): Promise<number> {
    try {
      const ds = await getDataSource();
      const repo = ds.getRepository(TenantSubscriptionEntity);
      const now = new Date();

      const overdue = await repo
        .createQueryBuilder('sub')
        .where('sub.status = :status', { status: 'PAST_DUE' })
        .andWhere('sub.gracePeriodEndsAt IS NOT NULL')
        .andWhere('sub.gracePeriodEndsAt <= :now', { now })
        .getMany();

      for (const sub of overdue) {
        await repo.update({ tenantId: sub.tenantId }, { status: 'EXPIRED' } as any);
        await TenantFeatureGateService.invalidateFeatureCache(sub.tenantId);
        Logger.info(`Subscription expired for tenant ${sub.tenantId} — grace period ended`);
      }

      return overdue.length;
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.SUBSCRIPTION_EXPIRE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof AppError) throw error;
      throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_EXPIRE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }
}
