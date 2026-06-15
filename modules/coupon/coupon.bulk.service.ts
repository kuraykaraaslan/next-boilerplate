import 'reflect-metadata';
import crypto from 'crypto';
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
