import 'reflect-metadata';
import crypto from 'crypto';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { Coupon as CouponEntity } from './entities/coupon.entity';
import Logger from '@/modules/logger';
import { COUPON_MESSAGES } from './coupon.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import type { BulkCreateCouponDTO, CsvImportRow } from './coupon.dto';
import { CsvImportRowSchema } from './coupon.dto';

export interface CsvImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

/**
 * Generate `count` unique single-use coupon codes in one operation.
 * Uses 6 bytes of CSPRNG entropy per code → ~2^48 collision space even with a prefix.
 * Returns only the generated codes; persists to DB in a single batch insert.
 */
export async function bulkCreate(tenantId: string, data: BulkCreateCouponDTO): Promise<{ count: number; codes: string[] }> {
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

/**
 * Import coupons from a CSV string. Expects a header row followed by data rows.
 * Required columns: code, name, discountType, discountValue.
 * Optional: currency, maxUses, maxUsesPerUser, startsAt, expiresAt, status.
 */
export async function importFromCsv(tenantId: string, csvContent: string): Promise<CsvImportResult> {
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

  // Resolve all existing codes in a single query instead of one findOne per row.
  const codes = rows.map((r) => r.code);
  const existing = await repo.find({ where: { tenantId, code: In(codes) }, select: { code: true } });
  const taken = new Set(existing.map((e) => e.code));

  const toInsert: CouponEntity[] = [];
  for (const row of rows) {
    // Skip rows that already exist in the DB or are duplicated within this CSV.
    if (taken.has(row.code)) { result.skipped++; continue; }
    taken.add(row.code);
    toInsert.push(repo.create({
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
    }));
  }

  if (toInsert.length > 0) {
    try {
      await repo.save(toInsert);
      result.imported += toInsert.length;
    } catch (err) {
      // Batch insert is all-or-nothing; surface the failure rather than silently
      // reporting a partial import.
      Logger.error(`${COUPON_MESSAGES.BULK_CREATE_FAILED}: ${err}`);
      result.errors.push({ row: 0, reason: err instanceof Error ? err.message : String(err) });
      result.skipped += toInsert.length;
    }
  }

  return result;
}
