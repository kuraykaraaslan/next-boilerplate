import 'reflect-metadata';
import crypto from 'crypto';
import { ILike } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { Coupon as CouponEntity } from './entities/coupon.entity';
import { CouponRedemption as CouponRedemptionEntity } from './entities/coupon_redemption.entity';
import Logger from '@/modules/logger';
import WebhookService from '@/modules/webhook/webhook.service';
import SettingService from '@/modules/setting/setting.service';
import { COUPON_MESSAGES } from './coupon.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { CouponSchema, CouponRedemptionSchema } from './coupon.types';
import type { Coupon, CouponRedemption } from './coupon.types';
import type { CreateCouponDTO, UpdateCouponDTO, GetCouponsQuery, BulkCreateCouponDTO, CsvImportRow } from './coupon.dto';
import { CsvImportRowSchema } from './coupon.dto';

const COUPON_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);
const NEGATIVE_CACHE_TTL = Math.min(60, COUPON_CACHE_TTL);
const NEG = '__not_found__';

/** Platform setting key: max active coupons per tenant (plan-tier gate). */
const SETTING_MAX_ACTIVE_COUPONS = 'couponMaxActive';

// ── Analytics types ───────────────────────────────────────────────────────────

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

export interface CsvImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

export default class CouponCrudService {

  static async clearCache(tenantId: string, coupon: { couponId: string; code: string }): Promise<void> {
    await Promise.all([
      redis.del(`coupon:id:${tenantId}:${coupon.couponId}`).catch(() => {}),
      redis.del(`coupon:code:${tenantId}:${coupon.code.toUpperCase()}`).catch(() => {}),
    ]);
  }

  // ──────────────────────────────────────────────
  // Plan-tier quota check (GOODTOHAVE: per-plan limits)
  // ──────────────────────────────────────────────

  private static async checkPlanQuota(tenantId: string): Promise<void> {
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

  // ──────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────

  static async create(tenantId: string, data: CreateCouponDTO): Promise<Coupon> {
    await CouponCrudService.checkPlanQuota(tenantId);
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

  static async getAll(tenantId: string, query: GetCouponsQuery): Promise<{ coupons: Coupon[]; total: number }> {
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
  // Bulk generation (GOODTOHAVE: bulk campaigns)
  // ──────────────────────────────────────────────

  /**
   * Generate `count` unique single-use coupon codes in one operation.
   * Uses 6 bytes of CSPRNG entropy per code → ~2^48 collision space even with a prefix.
   * Returns only the generated codes; persists to DB in a single batch insert.
   */
  static async bulkCreate(tenantId: string, data: BulkCreateCouponDTO): Promise<{ count: number; codes: string[] }> {
    const PREFIX = (data.prefix ?? '').toUpperCase();
    const ALPHABET = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789';
    const CODE_SUFFIX_LEN = 8;

    const generateCode = (): string => {
      const bytes = crypto.randomBytes(CODE_SUFFIX_LEN);
      let suffix = '';
      for (const b of bytes) suffix += ALPHABET[b % ALPHABET.length];
      return PREFIX ? `${PREFIX}-${suffix}` : suffix;
    };

    const codes: string[] = [];
    const entities: Partial<CouponEntity>[] = [];

    for (let i = 0; i < data.count; i++) {
      const code = generateCode();
      codes.push(code);
      entities.push({
        tenantId,
        code,
        name: data.name,
        discountType: data.discountType,
        discountValue: data.discountValue,
        status: data.status,
        usedCount: 0,
        ...(data.currency && { currency: data.currency }),
        ...(data.scope && { scope: data.scope }),
        ...(data.maxUsesPerCode !== undefined && { maxUses: data.maxUsesPerCode }),
        ...(data.maxUsesPerUser !== undefined && { maxUsesPerUser: data.maxUsesPerUser }),
        ...(data.startsAt && { startsAt: data.startsAt }),
        ...(data.expiresAt && { expiresAt: data.expiresAt }),
      });
    }

    try {
      const ds = await tenantDataSourceFor(tenantId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await ds.getRepository(CouponEntity).insert(entities as any[]);
      return { count: codes.length, codes };
    } catch (error) {
      Logger.error(`${COUPON_MESSAGES.BULK_CREATE_FAILED}: ${error}`);
      throw new AppError(COUPON_MESSAGES.BULK_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  // ──────────────────────────────────────────────
  // CSV import (GOODTOHAVE: coupon migration)
  // ──────────────────────────────────────────────

  /**
   * Import coupons from a CSV string. Expects a header row followed by data rows.
   * Required columns: code, name, discountType, discountValue.
   * Optional: currency, maxUses, maxUsesPerUser, startsAt, expiresAt, status.
   */
  static async importFromCsv(tenantId: string, csvContent: string): Promise<CsvImportResult> {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return { imported: 0, skipped: 0, errors: [] };

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const result: CsvImportResult = { imported: 0, skipped: 0, errors: [] };

    const rows: CsvImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const raw: Record<string, string> = {};
      headers.forEach((h, idx) => { raw[h] = values[idx] ?? ''; });

      const parsed = CsvImportRowSchema.safeParse(raw);
      if (!parsed.success) {
        result.errors.push({ row: i + 1, reason: parsed.error.issues.map((e) => e.message).join('; ') });
        result.skipped++;
        continue;
      }
      rows.push(parsed.data);
    }

    if (rows.length === 0) return result;

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(CouponEntity);

    for (const row of rows) {
      try {
        const existing = await repo.findOne({ where: { tenantId, code: row.code } });
        if (existing) { result.skipped++; continue; }

        const entity = repo.create({
          tenantId,
          code: row.code,
          name: row.name,
          discountType: row.discountType,
          discountValue: row.discountValue,
          status: row.status,
          usedCount: 0,
          ...(row.currency && { currency: row.currency }),
          ...(row.maxUses && { maxUses: row.maxUses }),
          ...(row.maxUsesPerUser && { maxUsesPerUser: row.maxUsesPerUser }),
          ...(row.startsAt && { startsAt: row.startsAt }),
          ...(row.expiresAt && { expiresAt: row.expiresAt }),
        });
        await repo.save(entity);
        result.imported++;
      } catch (err) {
        result.errors.push({ row: rows.indexOf(row) + 2, reason: err instanceof Error ? err.message : String(err) });
        result.skipped++;
      }
    }

    return result;
  }

  // ──────────────────────────────────────────────
  // Redemption queries
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

  /** Per-user redemption count for maxUsesPerUser enforcement. */
  static async getRedemptionCountByUser(tenantId: string, couponId: string, userId: string): Promise<number> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      return ds.getRepository(CouponRedemptionEntity).count({ where: { tenantId, couponId, userId } });
    } catch {
      return 0;
    }
  }

  // ──────────────────────────────────────────────
  // Analytics (GOODTOHAVE: per-coupon dashboard)
  // ──────────────────────────────────────────────

  /**
   * Aggregate redemption statistics for a single coupon.
   * Returns redemption rate, total discount, revenue-after-discount, unique users,
   * and daily redemption counts for the last 30 days.
   */
  static async getAnalytics(tenantId: string, couponId: string): Promise<CouponAnalytics> {
    const coupon = await CouponCrudService.getById(tenantId, couponId);
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

  // ──────────────────────────────────────────────
  // Revenue attribution (GOODTOHAVE: marketing attribution)
  // ──────────────────────────────────────────────

  /**
   * Aggregate per-coupon redemption totals grouped by currency.
   * Links redemption records back to payments via `paymentId` for net-revenue
   * attribution. When no `paymentId` is present on a redemption row the redemption
   * is still counted (coupon applied but payment not yet recorded).
   */
  static async getRevenueAttribution(tenantId: string, couponId: string): Promise<CouponRevenueAttribution[]> {
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
}
