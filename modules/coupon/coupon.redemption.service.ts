import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { CouponRedemption as CouponRedemptionEntity } from './entities/coupon_redemption.entity';
import Logger from '@/modules/logger';
import { COUPON_MESSAGES } from './coupon.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { CouponRedemptionSchema } from './coupon.types';
import type { CouponRedemption } from './coupon.types';

export async function getRedemptionsByTenant(
  tenantId: string,
  page = 0,
  pageSize = 20,
): Promise<{ redemptions: CouponRedemption[]; total: number }> {
  try {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(CouponRedemptionEntity);
    const [rows, total] = await repo.findAndCount({
      where: { tenantId },
      skip: page * pageSize,
      take: pageSize,
      order: { appliedAt: 'DESC' },
    });
    return { redemptions: rows.map((r) => CouponRedemptionSchema.parse(r)), total };
  } catch (error) {
    if (error instanceof AppError) throw error;
    Logger.error(`${COUPON_MESSAGES.FETCH_FAILED}: ${error}`);
    throw new AppError(COUPON_MESSAGES.FETCH_FAILED, 500, ErrorCode.INTERNAL_ERROR);
  }
}

export async function getRedemptionCount(tenantId: string, couponId: string): Promise<number> {
  try {
    const ds = await tenantDataSourceFor(tenantId);
    return ds.getRepository(CouponRedemptionEntity).count({ where: { tenantId, couponId } });
  } catch {
    return 0;
  }
}

/** Per-user redemption count for maxUsesPerUser enforcement. */
export async function getRedemptionCountByUser(tenantId: string, couponId: string, userId: string): Promise<number> {
  try {
    const ds = await tenantDataSourceFor(tenantId);
    return ds.getRepository(CouponRedemptionEntity).count({ where: { tenantId, couponId, userId } });
  } catch {
    return 0;
  }
}
