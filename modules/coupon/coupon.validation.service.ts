import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { Coupon as CouponEntity } from './entities/coupon.entity';
import { CouponRedemption as CouponRedemptionEntity } from './entities/coupon_redemption.entity';
import Logger from '@/modules/logger';
import WebhookService from '@/modules/webhook/webhook.service';
import { COUPON_MESSAGES } from './coupon.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { CouponRedemptionSchema, CouponValidationResultSchema } from './coupon.types';
import type { Coupon, CouponRedemption, CouponValidationResult } from './coupon.types';
import type { ValidateCouponDTO, ApplyCouponDTO, CouponScope } from './coupon.dto';
import CouponCrudService from './coupon.crud.service';

export default class CouponValidationService {

  // ──────────────────────────────────────────────
  // Validation
  // ──────────────────────────────────────────────

  static async validate(dto: ValidateCouponDTO): Promise<CouponValidationResult> {
    const coupon = await CouponCrudService.getByCode(dto.tenantId, dto.code);

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

    const scopeCheck = CouponValidationService.scopeApplies(coupon.scope, {
      planId: dto.planId,
      productIds: dto.productIds,
      categoryIds: dto.categoryIds,
      provider: dto.provider,
      amount: dto.amount,
      currency: dto.currency,
      countryCode: dto.countryCode,
    });
    if (!scopeCheck.ok) {
      return CouponValidationResultSchema.parse({ valid: false, message: scopeCheck.reason });
    }

    if (coupon.maxUsesPerTenant !== null && coupon.maxUsesPerTenant !== undefined) {
      const tenantUses = await CouponCrudService.getRedemptionCount(dto.tenantId, coupon.couponId);
      if (tenantUses >= coupon.maxUsesPerTenant) {
        return CouponValidationResultSchema.parse({ valid: false, message: COUPON_MESSAGES.MAX_USES_PER_TENANT_REACHED });
      }
    }

    // Per-user redemption cap
    if (coupon.maxUsesPerUser !== null && coupon.maxUsesPerUser !== undefined && dto.userId) {
      const userUses = await CouponCrudService.getRedemptionCountByUser(dto.tenantId, coupon.couponId, dto.userId);
      if (userUses >= coupon.maxUsesPerUser) {
        return CouponValidationResultSchema.parse({ valid: false, message: COUPON_MESSAGES.MAX_USES_PER_USER_REACHED });
      }
    }

    const amount = dto.amount ?? 0;
    const discountAmount = CouponValidationService.calculateDiscount(coupon, amount, dto.currency);
    const finalAmount = Math.max(0, amount - discountAmount);

    return CouponValidationResultSchema.parse({ valid: true, coupon, discountAmount, finalAmount });
  }

  static scopeApplies(
    scope: CouponScope | null | undefined,
    ctx: {
      planId?: string;
      productIds?: string[];
      categoryIds?: string[];
      provider?: string;
      amount?: number;
      currency?: string;
      countryCode?: string;
    },
  ): { ok: true } | { ok: false; reason: string } {
    if (!scope) return { ok: true };

    // Geo restriction (GOODTOHAVE: geographic)
    if (scope.countryCodes && scope.countryCodes.length > 0 && ctx.countryCode) {
      if (!scope.countryCodes.includes(ctx.countryCode.toUpperCase())) {
        return { ok: false, reason: COUPON_MESSAGES.COUNTRY_RESTRICTED };
      }
    }

    if (scope.planIds !== undefined && ctx.planId) {
      if (!scope.planIds.includes(ctx.planId)) {
        return { ok: false, reason: COUPON_MESSAGES.PLAN_NOT_ELIGIBLE };
      }
    }
    if (scope.productIds !== undefined && ctx.productIds && ctx.productIds.length > 0) {
      if (!ctx.productIds.some((id) => scope.productIds!.includes(id))) {
        return { ok: false, reason: COUPON_MESSAGES.PLAN_NOT_ELIGIBLE };
      }
    }
    if (scope.categoryIds !== undefined && ctx.categoryIds && ctx.categoryIds.length > 0) {
      if (!ctx.categoryIds.some((id) => scope.categoryIds!.includes(id))) {
        return { ok: false, reason: COUPON_MESSAGES.PLAN_NOT_ELIGIBLE };
      }
    }
    if (scope.providers !== undefined && ctx.provider) {
      if (!scope.providers.includes(ctx.provider)) {
        return { ok: false, reason: COUPON_MESSAGES.PROVIDER_NOT_ELIGIBLE };
      }
    }

    // Currency-aware minimum amount (GOODTOHAVE: currency-aware minimum)
    if (scope.minimumAmount !== undefined && ctx.amount !== undefined) {
      if (scope.minimumAmountCurrency && ctx.currency &&
          scope.minimumAmountCurrency.toUpperCase() !== ctx.currency.toUpperCase()) {
        // Currency mismatch: cannot compare amounts across different currencies, skip check
      } else if (ctx.amount < scope.minimumAmount) {
        return { ok: false, reason: COUPON_MESSAGES.MINIMUM_AMOUNT_NOT_MET };
      }
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

  // ──────────────────────────────────────────────
  // Apply — race-condition-safe (GOODTOHAVE: race-safe maxUses)
  //
  // The old pattern: validate() reads usedCount, then apply() does a plain
  // INCREMENT. Between the two calls, concurrent requests can each pass the
  // maxUses check and all increment past the limit.
  //
  // Fix: inside the transaction, issue a conditional UPDATE that increments
  // usedCount only when usedCount < maxUses. If 0 rows are affected, the limit
  // was hit concurrently and we abort with MAX_USES_REACHED.
  // ──────────────────────────────────────────────

  static async apply(dto: ApplyCouponDTO): Promise<CouponRedemption> {
    const validation = await CouponValidationService.validate({
      code: dto.code,
      tenantId: dto.tenantId,
      userId: dto.userId,
      planId: dto.planId,
      productIds: dto.productIds,
      categoryIds: dto.categoryIds,
      amount: dto.amount,
      currency: dto.currency,
      provider: dto.provider,
      countryCode: dto.countryCode,
    });

    if (!validation.valid || !validation.coupon) {
      throw new AppError(validation.message ?? COUPON_MESSAGES.APPLY_FAILED, 422, ErrorCode.VALIDATION_ERROR);
    }

    const discountAmount = validation.discountAmount!;
    const finalAmount = validation.finalAmount!;
    const { couponId, code, maxUses } = validation.coupon;

    try {
      const tenantDs = await tenantDataSourceFor(dto.tenantId);
      const saved = await tenantDs.transaction(async (mgr) => {
        const couponRepo = mgr.getRepository(CouponEntity);

        // Race-condition-safe increment: UPDATE ... SET usedCount = usedCount + 1
        // WHERE couponId = ? AND tenantId = ? AND (maxUses IS NULL OR usedCount < maxUses)
        const result = await couponRepo
          .createQueryBuilder()
          .update(CouponEntity)
          .set({ usedCount: () => '"usedCount" + 1' })
          .where('tenantId = :tenantId AND couponId = :couponId', { tenantId: dto.tenantId, couponId })
          .andWhere('(:maxUses::int IS NULL OR "usedCount" < :maxUses::int)', { maxUses: maxUses ?? null })
          .execute();

        if (result.affected === 0) {
          // Concurrent request beat us to the last slot
          throw new AppError(COUPON_MESSAGES.MAX_USES_REACHED, 422, ErrorCode.VALIDATION_ERROR);
        }

        const redemptionRepo = mgr.getRepository(CouponRedemptionEntity);
        const redemption = redemptionRepo.create({
          couponId,
          couponCode: code,
          tenantId: dto.tenantId,
          paymentId: dto.paymentId,
          userId: dto.userId,
          discountAmount,
          currency: dto.currency,
          originalAmount: dto.amount,
          finalAmount,
        });
        return redemptionRepo.save(redemption);
      });

      await CouponCrudService.clearCache(dto.tenantId, { couponId, code });

      WebhookService.dispatchEvent(dto.tenantId, 'coupon.redeemed', {
        couponId,
        code,
        redemptionId: saved.redemptionId,
        userId: saved.userId ?? null,
        discountAmount,
        finalAmount,
      }).catch(() => {});

      return CouponRedemptionSchema.parse(saved);
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`${COUPON_MESSAGES.APPLY_FAILED}: ${error}`);
      throw new AppError(COUPON_MESSAGES.APPLY_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }
}
