import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { CouponRedemption as CouponRedemptionEntity } from './entities/coupon_redemption.entity';
import { getById } from './coupon.crud.core.service';

export interface CouponAnalytics {
  couponId: string;
  code: string;
  name: string;
  maxUses: number | null;
  usedCount: number;
  redemptionRate: number | null;
  totalDiscountAmount: number;
  totalRevenueAfterDiscount: number;
  uniqueUsers: number;
  redemptionsByDay: { date: string; count: number }[];
}

export interface CouponRevenueAttribution {
  couponId: string;
  code: string;
  totalPayments: number;
  totalOriginalAmount: number;
  totalDiscountAmount: number;
  totalFinalAmount: number;
  currency: string;
}

/**
 * Aggregate redemption statistics for a single coupon.
 * Returns redemption rate, total discount, revenue-after-discount, unique users,
 * and daily redemption counts for the last 30 days.
 */
export async function getAnalytics(tenantId: string, couponId: string): Promise<CouponAnalytics> {
  const coupon = await getById(tenantId, couponId);
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(CouponRedemptionEntity);

  const [aggregates] = await repo
    .createQueryBuilder('r')
    .select('SUM(r.discountAmount)', 'totalDiscount')
    .addSelect('SUM(r.finalAmount)', 'totalFinal')
    .addSelect('COUNT(DISTINCT r.userId)', 'uniqueUsers')
    .where('r.tenantId = :tenantId AND r.couponId = :couponId', { tenantId, couponId })
    .getRawMany();

  const dailyRows = await repo
    .createQueryBuilder('r')
    .select("DATE_TRUNC('day', r.appliedAt)::date::text", 'date')
    .addSelect('COUNT(*)', 'count')
    .where('r.tenantId = :tenantId AND r.couponId = :couponId AND r.appliedAt >= NOW() - INTERVAL \'30 days\'',
      { tenantId, couponId })
    .groupBy("DATE_TRUNC('day', r.appliedAt)")
    .orderBy("DATE_TRUNC('day', r.appliedAt)", 'ASC')
    .getRawMany();

  const totalDiscount = parseFloat(aggregates?.totalDiscount ?? '0');
  const totalFinal    = parseFloat(aggregates?.totalFinal ?? '0');
  const uniqueUsers   = parseInt(aggregates?.uniqueUsers ?? '0', 10);

  return {
    couponId:                  coupon.couponId,
    code:                      coupon.code,
    name:                      coupon.name,
    maxUses:                   coupon.maxUses ?? null,
    usedCount:                 coupon.usedCount,
    redemptionRate:            coupon.maxUses ? coupon.usedCount / coupon.maxUses : null,
    totalDiscountAmount:       totalDiscount,
    totalRevenueAfterDiscount: totalFinal,
    uniqueUsers,
    redemptionsByDay:          dailyRows.map((r) => ({ date: r.date as string, count: parseInt(r.count, 10) })),
  };
}

/**
 * Aggregate per-coupon redemption totals grouped by currency.
 * Links redemption records back to payments via `paymentId` for net-revenue
 * attribution. When no `paymentId` is present on a redemption row the redemption
 * is still counted (coupon applied but payment not yet recorded).
 */
export async function getRevenueAttribution(tenantId: string, couponId: string): Promise<CouponRevenueAttribution[]> {
  const ds = await tenantDataSourceFor(tenantId);
  const rows = await ds.getRepository(CouponRedemptionEntity)
    .createQueryBuilder('r')
    .select('r.currency', 'currency')
    .addSelect('COUNT(DISTINCT r.paymentId)', 'totalPayments')
    .addSelect('SUM(r.originalAmount)', 'totalOriginalAmount')
    .addSelect('SUM(r.discountAmount)', 'totalDiscountAmount')
    .addSelect('SUM(r.finalAmount)', 'totalFinalAmount')
    .where('r.tenantId = :tenantId AND r.couponId = :couponId', { tenantId, couponId })
    .groupBy('r.currency')
    .getRawMany();

  return rows.map((r) => ({
    couponId,
    code:                 '',
    totalPayments:        parseInt(r.totalPayments, 10),
    totalOriginalAmount:  parseFloat(r.totalOriginalAmount ?? '0'),
    totalDiscountAmount:  parseFloat(r.totalDiscountAmount ?? '0'),
    totalFinalAmount:     parseFloat(r.totalFinalAmount ?? '0'),
    currency:             r.currency as string,
  }));
}
