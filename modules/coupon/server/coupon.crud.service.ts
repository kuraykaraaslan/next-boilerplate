import 'reflect-metadata';
import type { Coupon, CouponRedemption } from './coupon.types';
import type { CreateCouponDTO, UpdateCouponDTO, GetCouponsQuery, BulkCreateCouponDTO } from './coupon.dto';
import { clearCache } from './coupon.cache';
import {
  checkPlanQuota, create, getAll, getById, getByCode, update, archive,
} from './coupon.crud.core.service';
import { bulkCreate, importFromCsv, type CsvImportResult } from './coupon.bulk.service';
import {
  getRedemptionsByTenant, getRedemptionCount, getRedemptionCountByUser,
} from './coupon.redemption.service';
import {
  getAnalytics, getRevenueAttribution,
  type CouponAnalytics, type CouponRevenueAttribution,
} from './coupon.analytics.service';

export type { CouponAnalytics, CouponRevenueAttribution, CsvImportResult };

/**
 * Coupon CRUD service facade. The implementation is split across focused
 * modules (`coupon.crud.core.service`, `coupon.bulk.service`,
 * `coupon.redemption.service`, `coupon.analytics.service`, plus the
 * `coupon.cache` helper); this class preserves the single
 * `CouponCrudService.*` entry point its callers depend on.
 */
export default class CouponCrudService {
  static clearCache(tenantId: string, coupon: { couponId: string; code: string }): Promise<void> {
    return clearCache(tenantId, coupon);
  }

  static create(tenantId: string, data: CreateCouponDTO): Promise<Coupon> {
    return create(tenantId, data);
  }

  static getAll(tenantId: string, query: GetCouponsQuery): Promise<{ coupons: Coupon[]; total: number }> {
    return getAll(tenantId, query);
  }

  static getById(tenantId: string, couponId: string): Promise<Coupon> {
    return getById(tenantId, couponId);
  }

  static getByCode(tenantId: string, code: string): Promise<Coupon | null> {
    return getByCode(tenantId, code);
  }

  static update(tenantId: string, couponId: string, data: UpdateCouponDTO): Promise<Coupon> {
    return update(tenantId, couponId, data);
  }

  static archive(tenantId: string, couponId: string): Promise<void> {
    return archive(tenantId, couponId);
  }

  static checkPlanQuota(tenantId: string): Promise<void> {
    return checkPlanQuota(tenantId);
  }

  static bulkCreate(tenantId: string, data: BulkCreateCouponDTO): Promise<{ count: number; codes: string[] }> {
    return bulkCreate(tenantId, data);
  }

  static importFromCsv(tenantId: string, csvContent: string): Promise<CsvImportResult> {
    return importFromCsv(tenantId, csvContent);
  }

  static getRedemptionsByTenant(tenantId: string, page = 0, pageSize = 20): Promise<{ redemptions: CouponRedemption[]; total: number }> {
    return getRedemptionsByTenant(tenantId, page, pageSize);
  }

  static getRedemptionCount(tenantId: string, couponId: string): Promise<number> {
    return getRedemptionCount(tenantId, couponId);
  }

  static getRedemptionCountByUser(tenantId: string, couponId: string, userId: string): Promise<number> {
    return getRedemptionCountByUser(tenantId, couponId, userId);
  }

  static getAnalytics(tenantId: string, couponId: string): Promise<CouponAnalytics> {
    return getAnalytics(tenantId, couponId);
  }

  static getRevenueAttribution(tenantId: string, couponId: string): Promise<CouponRevenueAttribution[]> {
    return getRevenueAttribution(tenantId, couponId);
  }
}
