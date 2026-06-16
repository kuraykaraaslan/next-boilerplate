import 'reflect-metadata';
import { ILike } from 'typeorm';
import { tenantDataSourceFor } from '@nb/db';
import redis, { jitter, singleFlight } from '@nb/redis';
import { Coupon as CouponEntity } from './entities/coupon.entity';
import Logger from '@nb/logger';
import WebhookService from '@nb/webhook/server/webhook.service';
import SettingService from '@nb/setting/server/setting.service';
import { COUPON_MESSAGES } from './coupon.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { CouponSchema } from './coupon.types';
import type { Coupon } from './coupon.types';
import type { CreateCouponDTO, UpdateCouponDTO, GetCouponsQuery } from './coupon.dto';
import {
  COUPON_CACHE_TTL, NEGATIVE_CACHE_TTL, NEG, SETTING_MAX_ACTIVE_COUPONS, clearCache,
} from './coupon.cache';

// ── Plan-tier quota check (GOODTOHAVE: per-plan limits) ─────────────────────

export async function checkPlanQuota(tenantId: string): Promise<void> {
  const maxRaw = await SettingService.getValue(tenantId, SETTING_MAX_ACTIVE_COUPONS).catch(() => null);
  if (!maxRaw) return;
  const max = parseInt(maxRaw, 10);
  if (!Number.isFinite(max) || max <= 0) return;

  const ds = await tenantDataSourceFor(tenantId);
  const count = await ds.getRepository(CouponEntity).count({ where: { tenantId, status: 'ACTIVE' } });
  if (count >= max) {
    throw new AppError(COUPON_MESSAGES.PLAN_QUOTA_EXCEEDED, 422, ErrorCode.QUOTA_EXCEEDED);
  }
}

export async function create(tenantId: string, data: CreateCouponDTO): Promise<Coupon> {
  await checkPlanQuota(tenantId);
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
    if (data.description)       coupon.description       = data.description;
    if (data.nameI18n)          coupon.nameI18n          = data.nameI18n;
    if (data.descriptionI18n)   coupon.descriptionI18n   = data.descriptionI18n;
    if (data.currency)          coupon.currency          = data.currency;
    if (data.scope)             coupon.scope             = data.scope;
    if (data.maxUses)           coupon.maxUses           = data.maxUses;
    if (data.maxUsesPerTenant)  coupon.maxUsesPerTenant  = data.maxUsesPerTenant;
    if (data.maxUsesPerUser)    coupon.maxUsesPerUser    = data.maxUsesPerUser;
    if (data.startsAt)          coupon.startsAt          = data.startsAt;
    if (data.expiresAt)         coupon.expiresAt         = data.expiresAt;

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

export async function getAll(tenantId: string, query: GetCouponsQuery): Promise<{ coupons: Coupon[]; total: number }> {
  try {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(CouponEntity);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export async function getById(tenantId: string, couponId: string): Promise<Coupon> {
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

export async function getByCode(tenantId: string, code: string): Promise<Coupon | null> {
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

export async function update(tenantId: string, couponId: string, data: UpdateCouponDTO): Promise<Coupon> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(CouponEntity);
  const existing = await repo.findOne({ where: { tenantId, couponId } });
  if (!existing) throw new AppError(COUPON_MESSAGES.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  try {
    await repo.update({ tenantId, couponId }, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.nameI18n !== undefined && { nameI18n: data.nameI18n ?? undefined }),
      ...(data.description !== undefined && { description: data.description ?? undefined }),
      ...(data.descriptionI18n !== undefined && { descriptionI18n: data.descriptionI18n ?? undefined }),
      ...(data.discountType !== undefined && { discountType: data.discountType }),
      ...(data.discountValue !== undefined && { discountValue: data.discountValue }),
      ...(data.currency !== undefined && { currency: data.currency ?? undefined }),
      ...(data.scope !== undefined && { scope: data.scope ?? undefined }),
      ...(data.maxUses !== undefined && { maxUses: data.maxUses ?? undefined }),
      ...(data.maxUsesPerTenant !== undefined && { maxUsesPerTenant: data.maxUsesPerTenant ?? undefined }),
      ...(data.maxUsesPerUser !== undefined && { maxUsesPerUser: data.maxUsesPerUser ?? undefined }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.startsAt !== undefined && { startsAt: data.startsAt ?? undefined }),
      ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt ?? undefined }),
    });
    const updated = await repo.findOne({ where: { tenantId, couponId } });
    await clearCache(tenantId, { couponId: existing.couponId, code: existing.code });
    if (updated && updated.code !== existing.code) {
      await clearCache(tenantId, { couponId: updated.couponId, code: updated.code });
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

export async function archive(tenantId: string, couponId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(CouponEntity);
  const existing = await repo.findOne({ where: { tenantId, couponId } });
  if (!existing) throw new AppError(COUPON_MESSAGES.NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  await repo.update({ tenantId, couponId }, { status: 'ARCHIVED' });
  await clearCache(tenantId, { couponId: existing.couponId, code: existing.code });
}
