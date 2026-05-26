import 'reflect-metadata';
import { ILike } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { Coupon as CouponEntity } from './entities/coupon.entity';
import { CouponRedemption as CouponRedemptionEntity } from './entities/coupon_redemption.entity';
import Logger from '@/modules/logger';
import { COUPON_MESSAGES } from './coupon.messages';
import {
  CouponSchema,
  CouponRedemptionSchema,
  CouponValidationResultSchema,
} from './coupon.types';
import type { Coupon, CouponRedemption, CouponValidationResult } from './coupon.types';
import type {
  CreateCouponDTO,
  UpdateCouponDTO,
  GetCouponsQuery,
  ValidateCouponDTO,
  ApplyCouponDTO,
  CouponScope,
} from './coupon.dto';

const COUPON_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);
const NEGATIVE_CACHE_TTL = Math.min(60, COUPON_CACHE_TTL);
const NEG = '__not_found__';

export default class CouponService {

  private static async clearCache(tenantId: string, coupon: { couponId: string; code: string }) {
    await Promise.all([
      redis.del(`coupon:id:${tenantId}:${coupon.couponId}`).catch(() => {}),
      redis.del(`coupon:code:${tenantId}:${coupon.code.toUpperCase()}`).catch(() => {}),
    ]);
  }

  // ============================================================================
  // Admin CRUD
  // ============================================================================

  static async create(tenantId: string, data: CreateCouponDTO): Promise<Coupon> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(CouponEntity);

      const existing = await repo.findOne({ where: { tenantId, code: data.code } });
      if (existing) throw new Error(COUPON_MESSAGES.CODE_EXISTS);

      const coupon = new CouponEntity();
      coupon.tenantId = tenantId;
      coupon.code = data.code;
      coupon.name = data.name;
      coupon.discountType = data.discountType;
      coupon.discountValue = data.discountValue;
      coupon.status = data.status;
      coupon.usedCount = 0;
      if (data.description) coupon.description = data.description;
      if (data.currency) coupon.currency = data.currency;
      if (data.scope) coupon.scope = data.scope;
      if (data.maxUses) coupon.maxUses = data.maxUses;
      if (data.maxUsesPerTenant) coupon.maxUsesPerTenant = data.maxUsesPerTenant;
      if (data.startsAt) coupon.startsAt = data.startsAt;
      if (data.expiresAt) coupon.expiresAt = data.expiresAt;

      const saved = await repo.save(coupon as CouponEntity);
      await redis.del(`coupon:code:${tenantId}:${data.code.toUpperCase()}`).catch(() => {});
      return CouponSchema.parse(saved);
    } catch (error) {
      if (error instanceof Error && error.message === COUPON_MESSAGES.CODE_EXISTS) throw error;
      Logger.error(`${COUPON_MESSAGES.CREATE_FAILED}: ${error}`);
      throw new Error(COUPON_MESSAGES.CREATE_FAILED);
    }
  }

  static async getAll(tenantId: string, query: GetCouponsQuery): Promise<{ coupons: Coupon[]; total: number }> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(CouponEntity);

      const where: Record<string, any> = { tenantId };
      if (query.status) where.status = query.status;
      if (query.search) where.code = ILike(`%${query.search}%`);

      const [rows, total] = await repo.findAndCount({
        where,
        skip: query.page * query.pageSize,
        take: query.pageSize,
        order: { createdAt: 'DESC' },
      });

      return { coupons: rows.map((r) => CouponSchema.parse(r)), total };
    } catch (error) {
      Logger.error(`${COUPON_MESSAGES.FETCH_FAILED}: ${error}`);
      throw new Error(COUPON_MESSAGES.FETCH_FAILED);
    }
  }

  static async getById(tenantId: string, couponId: string): Promise<Coupon> {
    const cacheKey = `coupon:id:${tenantId}:${couponId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return CouponSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await tenantDataSourceFor(tenantId);
      const coupon = await ds.getRepository(CouponEntity).findOne({ where: { tenantId, couponId } });
      if (!coupon) throw new Error(COUPON_MESSAGES.NOT_FOUND);

      const parsed = CouponSchema.parse(coupon);
      await redis.setex(cacheKey, jitter(COUPON_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  static async getByCode(tenantId: string, code: string): Promise<Coupon | null> {
    const cacheKey = `coupon:code:${tenantId}:${code.toUpperCase()}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached === NEG) return null;
    if (cached) {
      try { return CouponSchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await tenantDataSourceFor(tenantId);
      const coupon = await ds.getRepository(CouponEntity).findOne({ where: { tenantId, code: code.toUpperCase() } });
      if (!coupon) {
        await redis.setex(cacheKey, jitter(NEGATIVE_CACHE_TTL), NEG).catch(() => {});
        return null;
      }

      const parsed = CouponSchema.parse(coupon);
      await redis.setex(cacheKey, jitter(COUPON_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  static async update(tenantId: string, couponId: string, data: UpdateCouponDTO): Promise<Coupon> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(CouponEntity);
    const existing = await repo.findOne({ where: { tenantId, couponId } });
    if (!existing) throw new Error(COUPON_MESSAGES.NOT_FOUND);

    try {
      await repo.update({ tenantId, couponId }, {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description ?? undefined }),
        ...(data.discountType !== undefined && { discountType: data.discountType }),
        ...(data.discountValue !== undefined && { discountValue: data.discountValue }),
        ...(data.currency !== undefined && { currency: data.currency ?? undefined }),
        ...(data.scope !== undefined && { scope: data.scope ?? undefined }),
        ...(data.maxUses !== undefined && { maxUses: data.maxUses ?? undefined }),
        ...(data.maxUsesPerTenant !== undefined && { maxUsesPerTenant: data.maxUsesPerTenant ?? undefined }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.startsAt !== undefined && { startsAt: data.startsAt ?? undefined }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt ?? undefined }),
      });
      const updated = await repo.findOne({ where: { tenantId, couponId } });
      await this.clearCache(tenantId, { couponId: existing.couponId, code: existing.code });
      if (updated && updated.code !== existing.code) {
        await this.clearCache(tenantId, { couponId: updated.couponId, code: updated.code });
      }
      return CouponSchema.parse(updated!);
    } catch (error) {
      Logger.error(`${COUPON_MESSAGES.UPDATE_FAILED}: ${error}`);
      throw new Error(COUPON_MESSAGES.UPDATE_FAILED);
    }
  }

  static async archive(tenantId: string, couponId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(CouponEntity);
    const existing = await repo.findOne({ where: { tenantId, couponId } });
    if (!existing) throw new Error(COUPON_MESSAGES.NOT_FOUND);
    await repo.update({ tenantId, couponId }, { status: 'ARCHIVED' });
    await this.clearCache(tenantId, { couponId: existing.couponId, code: existing.code });
  }

  // ============================================================================
  // Validation
  // ============================================================================

  static async validate(dto: ValidateCouponDTO): Promise<CouponValidationResult> {
    const coupon = await CouponService.getByCode(dto.tenantId, dto.code);

    if (!coupon) {
      return CouponValidationResultSchema.parse({ valid: false, message: COUPON_MESSAGES.INVALID_CODE });
    }

    const now = new Date();

    if (coupon.status !== 'ACTIVE') {
      return CouponValidationResultSchema.parse({ valid: false, message: COUPON_MESSAGES.COUPON_INACTIVE });
    }

    if (coupon.startsAt && coupon.startsAt > now) {
      return CouponValidationResultSchema.parse({ valid: false, message: COUPON_MESSAGES.COUPON_NOT_STARTED });
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      return CouponValidationResultSchema.parse({ valid: false, message: COUPON_MESSAGES.COUPON_EXPIRED });
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return CouponValidationResultSchema.parse({ valid: false, message: COUPON_MESSAGES.MAX_USES_REACHED });
    }

    const scopeCheck = CouponService.scopeApplies(coupon.scope, {
      planId: dto.planId,
      productIds: dto.productIds,
      categoryIds: dto.categoryIds,
      provider: dto.provider,
      amount: dto.amount,
    });
    if (!scopeCheck.ok) {
      return CouponValidationResultSchema.parse({ valid: false, message: scopeCheck.reason });
    }

    if (coupon.maxUsesPerTenant !== null) {
      const tenantUses = await CouponService.getTenantRedemptionCount(dto.tenantId, coupon.couponId);
      if (tenantUses >= coupon.maxUsesPerTenant) {
        return CouponValidationResultSchema.parse({ valid: false, message: COUPON_MESSAGES.MAX_USES_PER_TENANT_REACHED });
      }
    }

    const amount = dto.amount ?? 0;
    const discountAmount = CouponService.calculateDiscount(coupon, amount, dto.currency);
    const finalAmount = Math.max(0, amount - discountAmount);

    return CouponValidationResultSchema.parse({
      valid: true,
      coupon,
      discountAmount,
      finalAmount,
    });
  }

  /**
   * Evaluate a coupon's scope against a usage context.
   * Missing/null scope dimensions are wildcards. Empty arrays are treated as "no match"
   * because they explicitly enumerate the set of allowed values to nothing.
   */
  static scopeApplies(
    scope: CouponScope | null | undefined,
    ctx: {
      planId?: string;
      productIds?: string[];
      categoryIds?: string[];
      provider?: string;
      amount?: number;
    },
  ): { ok: true } | { ok: false; reason: string } {
    if (!scope) return { ok: true };

    if (scope.planIds !== undefined && ctx.planId) {
      if (!scope.planIds.includes(ctx.planId)) {
        return { ok: false, reason: COUPON_MESSAGES.PLAN_NOT_ELIGIBLE };
      }
    }

    if (scope.productIds !== undefined && ctx.productIds && ctx.productIds.length > 0) {
      const allowed = scope.productIds;
      const matched = ctx.productIds.some((id) => allowed.includes(id));
      if (!matched) {
        return { ok: false, reason: COUPON_MESSAGES.PLAN_NOT_ELIGIBLE };
      }
    }

    if (scope.categoryIds !== undefined && ctx.categoryIds && ctx.categoryIds.length > 0) {
      const allowed = scope.categoryIds;
      const matched = ctx.categoryIds.some((id) => allowed.includes(id));
      if (!matched) {
        return { ok: false, reason: COUPON_MESSAGES.PLAN_NOT_ELIGIBLE };
      }
    }

    if (scope.providers !== undefined && ctx.provider) {
      if (!scope.providers.includes(ctx.provider)) {
        return { ok: false, reason: COUPON_MESSAGES.PROVIDER_NOT_ELIGIBLE };
      }
    }

    if (scope.minimumAmount !== undefined && ctx.amount !== undefined && ctx.amount < scope.minimumAmount) {
      return { ok: false, reason: COUPON_MESSAGES.MINIMUM_AMOUNT_NOT_MET };
    }

    return { ok: true };
  }

  static calculateDiscount(coupon: Coupon, amount: number, currency?: string): number {
    if (coupon.discountType === 'PERCENTAGE') {
      return parseFloat(((amount * coupon.discountValue) / 100).toFixed(2));
    }
    if (!coupon.currency || !currency || coupon.currency === currency.toUpperCase()) {
      return Math.min(coupon.discountValue, amount);
    }
    return 0;
  }

  // ============================================================================
  // Apply coupon (creates redemption record + increments usedCount)
  // ============================================================================

  static async apply(dto: ApplyCouponDTO): Promise<CouponRedemption> {
    const validation = await CouponService.validate({
      code: dto.code,
      tenantId: dto.tenantId,
      planId: dto.planId,
      productIds: dto.productIds,
      categoryIds: dto.categoryIds,
      amount: dto.amount,
      currency: dto.currency,
      provider: dto.provider,
    });

    if (!validation.valid || !validation.coupon) {
      throw new Error(validation.message ?? COUPON_MESSAGES.APPLY_FAILED);
    }

    const discountAmount = validation.discountAmount!;
    const finalAmount = validation.finalAmount!;

    try {
      const tenantDs = await tenantDataSourceFor(dto.tenantId);
      const redemptionRepo = tenantDs.getRepository(CouponRedemptionEntity);

      const redemption = redemptionRepo.create({
        couponId: validation.coupon.couponId,
        couponCode: validation.coupon.code,
        tenantId: dto.tenantId,
        paymentId: dto.paymentId,
        userId: dto.userId,
        discountAmount,
        currency: dto.currency,
        originalAmount: dto.amount,
        finalAmount,
      });
      const saved = await redemptionRepo.save(redemption);

      await tenantDs
        .getRepository(CouponEntity)
        .increment({ tenantId: dto.tenantId, couponId: validation.coupon.couponId }, 'usedCount', 1);

      await this.clearCache(dto.tenantId, { couponId: validation.coupon.couponId, code: validation.coupon.code });

      return CouponRedemptionSchema.parse(saved);
    } catch (error) {
      Logger.error(`${COUPON_MESSAGES.APPLY_FAILED}: ${error}`);
      throw new Error(COUPON_MESSAGES.APPLY_FAILED);
    }
  }

  // ============================================================================
  // Redemption queries
  // ============================================================================

  static async getRedemptionsByTenant(
    tenantId: string,
    page = 0,
    pageSize = 20
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
      Logger.error(`${COUPON_MESSAGES.FETCH_FAILED}: ${error}`);
      throw new Error(COUPON_MESSAGES.FETCH_FAILED);
    }
  }

  private static async getTenantRedemptionCount(tenantId: string, couponId: string): Promise<number> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      return ds.getRepository(CouponRedemptionEntity).count({ where: { tenantId, couponId } });
    } catch {
      return 0;
    }
  }
}
