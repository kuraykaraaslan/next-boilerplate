import 'reflect-metadata';
import { ILike } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { Coupon as CouponEntity } from './entities/coupon.entity';
import { CouponRedemption as CouponRedemptionEntity } from './entities/coupon_redemption.entity';
import Logger from '@/modules/logger';
import WebhookService from '@/modules/webhook/webhook.service';
import { COUPON_MESSAGES } from './coupon.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { CouponSchema, CouponRedemptionSchema } from './coupon.types';
import type { Coupon, CouponRedemption } from './coupon.types';
import type { CreateCouponDTO, UpdateCouponDTO, GetCouponsQuery } from './coupon.dto';

const COUPON_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);
const NEGATIVE_CACHE_TTL = Math.min(60, COUPON_CACHE_TTL);
const NEG = '__not_found__';

export default class CouponCrudService {

  static async clearCache(tenantId: string, coupon: { couponId: string; code: string }): Promise<void> {
    await Promise.all([
      redis.del(`coupon:id:${tenantId}:${coupon.couponId}`).catch(() => {}),
      redis.del(`coupon:code:${tenantId}:${coupon.code.toUpperCase()}`).catch(() => {}),
    ]);
  }

  // ──────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────

  static async create(tenantId: string, data: CreateCouponDTO): Promise<Coupon> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(CouponEntity);

      const existing = await repo.findOne({ where: { tenantId, code: data.code } });
      if (existing) throw new AppError(COUPON_MESSAGES.CODE_EXISTS, 409, ErrorCode.CONFLICT);

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
      await WebhookService.dispatchEvent(tenantId, 'coupon.created', {
        couponId: saved.couponId,
        code: saved.code,
        discountType: saved.discountType,
        discountValue: saved.discountValue,
        status: saved.status,
      });
      return CouponSchema.parse(saved);
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`${COUPON_MESSAGES.CREATE_FAILED}: ${error}`);
      throw new AppError(COUPON_MESSAGES.CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
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
      if (error instanceof AppError) throw error;
      Logger.error(`${COUPON_MESSAGES.FETCH_FAILED}: ${error}`);
      throw new AppError(COUPON_MESSAGES.FETCH_FAILED, 500, ErrorCode.INTERNAL_ERROR);
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
      if (!coupon) throw new AppError(COUPON_MESSAGES.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
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
    if (!existing) throw new AppError(COUPON_MESSAGES.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
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
      await CouponCrudService.clearCache(tenantId, { couponId: existing.couponId, code: existing.code });
      if (updated && updated.code !== existing.code) {
        await CouponCrudService.clearCache(tenantId, { couponId: updated.couponId, code: updated.code });
      }
      await WebhookService.dispatchEvent(tenantId, 'coupon.updated', {
        couponId: updated!.couponId,
        code: updated!.code,
        status: updated!.status,
      }).catch(() => {});
      return CouponSchema.parse(updated!);
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`${COUPON_MESSAGES.UPDATE_FAILED}: ${error}`);
      throw new AppError(COUPON_MESSAGES.UPDATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async archive(tenantId: string, couponId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(CouponEntity);
    const existing = await repo.findOne({ where: { tenantId, couponId } });
    if (!existing) throw new AppError(COUPON_MESSAGES.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    await repo.update({ tenantId, couponId }, { status: 'ARCHIVED' });
    await CouponCrudService.clearCache(tenantId, { couponId: existing.couponId, code: existing.code });
  }

  // ──────────────────────────────────────────────
  // Redemption Query
  // ──────────────────────────────────────────────

  static async getRedemptionsByTenant(
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

  static async getRedemptionCount(tenantId: string, couponId: string): Promise<number> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      return ds.getRepository(CouponRedemptionEntity).count({ where: { tenantId, couponId } });
    } catch {
      return 0;
    }
  }
}
