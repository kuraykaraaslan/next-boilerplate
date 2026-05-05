import 'reflect-metadata';
import { ILike, Like } from 'typeorm';
import { getSystemDataSource, tenantDataSourceFor } from '@/libs/typeorm';
import { Coupon as CouponEntity } from './entities/coupon.entity';
import { CouponRedemption as CouponRedemptionEntity } from './entities/coupon_redemption.entity';
import Logger from '@/libs/logger';
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
} from './coupon.dto';

export default class CouponService {

  // ============================================================================
  // Admin CRUD
  // ============================================================================

  static async create(data: CreateCouponDTO): Promise<Coupon> {
    try {
      const ds = await getSystemDataSource();
      const repo = ds.getRepository(CouponEntity);

      const existing = await repo.findOne({ where: { code: data.code } });
      if (existing) throw new Error(COUPON_MESSAGES.CODE_EXISTS);

      const coupon = repo.create({
        code: data.code,
        name: data.name,
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        currency: data.currency,
        applicablePlanIds: data.applicablePlanIds ?? null,
        applicableProviders: data.applicableProviders ?? null,
        maxUses: data.maxUses ?? null,
        maxUsesPerTenant: data.maxUsesPerTenant ?? null,
        minimumAmount: data.minimumAmount ?? null,
        status: data.status,
        startsAt: data.startsAt ?? null,
        expiresAt: data.expiresAt ?? null,
        usedCount: 0,
      });

      const saved = await repo.save(coupon);
      return CouponSchema.parse(saved);
    } catch (error) {
      if (error instanceof Error && error.message === COUPON_MESSAGES.CODE_EXISTS) throw error;
      Logger.error(`${COUPON_MESSAGES.CREATE_FAILED}: ${error}`);
      throw new Error(COUPON_MESSAGES.CREATE_FAILED);
    }
  }

  static async getAll(query: GetCouponsQuery): Promise<{ coupons: Coupon[]; total: number }> {
    try {
      const ds = await getSystemDataSource();
      const repo = ds.getRepository(CouponEntity);

      const where: Record<string, any> = {};
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

  static async getById(couponId: string): Promise<Coupon> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(CouponEntity);
    const coupon = await repo.findOne({ where: { couponId } });
    if (!coupon) throw new Error(COUPON_MESSAGES.NOT_FOUND);
    return CouponSchema.parse(coupon);
  }

  static async getByCode(code: string): Promise<Coupon | null> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(CouponEntity);
    const coupon = await repo.findOne({ where: { code: code.toUpperCase() } });
    return coupon ? CouponSchema.parse(coupon) : null;
  }

  static async update(couponId: string, data: UpdateCouponDTO): Promise<Coupon> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(CouponEntity);
    const existing = await repo.findOne({ where: { couponId } });
    if (!existing) throw new Error(COUPON_MESSAGES.NOT_FOUND);

    try {
      await repo.update({ couponId }, {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description ?? undefined }),
        ...(data.discountType !== undefined && { discountType: data.discountType }),
        ...(data.discountValue !== undefined && { discountValue: data.discountValue }),
        ...(data.currency !== undefined && { currency: data.currency ?? undefined }),
        ...(data.applicablePlanIds !== undefined && { applicablePlanIds: data.applicablePlanIds ?? undefined }),
        ...(data.applicableProviders !== undefined && { applicableProviders: data.applicableProviders ?? undefined }),
        ...(data.maxUses !== undefined && { maxUses: data.maxUses ?? undefined }),
        ...(data.maxUsesPerTenant !== undefined && { maxUsesPerTenant: data.maxUsesPerTenant ?? undefined }),
        ...(data.minimumAmount !== undefined && { minimumAmount: data.minimumAmount ?? undefined }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.startsAt !== undefined && { startsAt: data.startsAt ?? undefined }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt ?? undefined }),
      });
      const updated = await repo.findOne({ where: { couponId } });
      return CouponSchema.parse(updated!);
    } catch (error) {
      Logger.error(`${COUPON_MESSAGES.UPDATE_FAILED}: ${error}`);
      throw new Error(COUPON_MESSAGES.UPDATE_FAILED);
    }
  }

  static async archive(couponId: string): Promise<void> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(CouponEntity);
    const existing = await repo.findOne({ where: { couponId } });
    if (!existing) throw new Error(COUPON_MESSAGES.NOT_FOUND);
    await repo.update({ couponId }, { status: 'ARCHIVED' });
  }

  // ============================================================================
  // Validation
  // ============================================================================

  static async validate(dto: ValidateCouponDTO): Promise<CouponValidationResult> {
    const coupon = await CouponService.getByCode(dto.code);

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

    if (coupon.applicablePlanIds !== null && dto.planId && !coupon.applicablePlanIds.includes(dto.planId)) {
      return CouponValidationResultSchema.parse({ valid: false, message: COUPON_MESSAGES.PLAN_NOT_ELIGIBLE });
    }

    if (coupon.applicableProviders !== null && dto.provider && !coupon.applicableProviders.includes(dto.provider)) {
      return CouponValidationResultSchema.parse({ valid: false, message: COUPON_MESSAGES.PROVIDER_NOT_ELIGIBLE });
    }

    if (dto.amount && coupon.minimumAmount !== null && dto.amount < coupon.minimumAmount) {
      return CouponValidationResultSchema.parse({ valid: false, message: COUPON_MESSAGES.MINIMUM_AMOUNT_NOT_MET });
    }

    // Check per-tenant usage
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

  static calculateDiscount(coupon: Coupon, amount: number, currency?: string): number {
    if (coupon.discountType === 'PERCENTAGE') {
      return parseFloat(((amount * coupon.discountValue) / 100).toFixed(2));
    }
    // FIXED_AMOUNT — only apply if currencies match or coupon has no specific currency
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
      // Create redemption in tenant DB
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

      // Increment usedCount in system DB (optimistic, best-effort)
      const sysDs = await getSystemDataSource();
      await sysDs
        .getRepository(CouponEntity)
        .increment({ couponId: validation.coupon.couponId }, 'usedCount', 1);

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
