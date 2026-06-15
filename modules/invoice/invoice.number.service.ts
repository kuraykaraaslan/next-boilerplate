import 'reflect-metadata';
import type { EntityManager } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { Invoice as InvoiceEntity } from './entities/invoice.entity';

/**
 * Compute the period segment of an invoice number from the tenant's reset
 * policy. `yearly` → `2025`, `monthly` → `2025-06`, `fiscal` → fiscal year
 * label honouring `invoiceFiscalYearStartMonth` (1-12), `never` → `''`.
 */
export function periodSegment(resetPolicy?: string, fiscalStartMonthStr?: string, at: Date = new Date()): string {
  const policy = (resetPolicy ?? 'yearly').toLowerCase();
  const y = at.getUTCFullYear();
  const m = at.getUTCMonth() + 1; // 1-12
  if (policy === 'never') return '';
  if (policy === 'monthly') return `${y}-${String(m).padStart(2, '0')}`;
  if (policy === 'fiscal') {
    const start = Math.min(12, Math.max(1, fiscalStartMonthStr ? parseInt(fiscalStartMonthStr, 10) || 1 : 1));
    // Fiscal year is labelled by the calendar year in which it begins.
    const fiscalYear = m >= start ? y : y - 1;
    return String(fiscalYear);
  }
  return String(y); // yearly (default)
}

/**
 * Allocate the next gap-free invoice number for `(tenant, prefix, period)`.
 * MUST run inside a transaction: a `pg_advisory_xact_lock` serialises
 * concurrent allocations and a rollback releases the number without a gap.
 */
export async function allocateNumber(
  manager: EntityManager,
  tenantId: string,
  opts: { prefix?: string; padding?: string; resetPolicy?: string; fiscalStartMonth?: string; at?: Date } = {},
): Promise<string> {
  const padding = opts.padding ? parseInt(opts.padding, 10) : 5;
  const usedPrefix = opts.prefix ?? 'INV';
  const period = periodSegment(opts.resetPolicy, opts.fiscalStartMonth, opts.at ?? new Date());
  const search = period ? `${usedPrefix}-${period}-` : `${usedPrefix}-`;

  // Serialise per (tenant, prefix, period) so two concurrent creates can't
  // read the same MAX and collide on the unique (tenantId, invoiceNumber).
  await manager.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [`inv:${tenantId}:${search}`]);

  const row = await manager.getRepository(InvoiceEntity).createQueryBuilder('i')
    .select('i.invoiceNumber', 'invoiceNumber')
    .where('i.tenantId = :tid', { tid: tenantId })
    .andWhere('i.invoiceNumber LIKE :prefix', { prefix: `${search}%` })
    .orderBy('LENGTH(i.invoiceNumber)', 'DESC')
    .addOrderBy('i.invoiceNumber', 'DESC')
    .limit(1)
    .getRawOne<{ invoiceNumber: string }>();
  const lastSeq = row?.invoiceNumber ? parseInt(row.invoiceNumber.split('-').pop() ?? '0', 10) : 0;
  const next = (lastSeq + 1).toString().padStart(padding, '0');
  return `${search}${next}`;
}

/** Backward-compatible standalone allocator (own transaction). */
export async function getNextInvoiceNumber(tenantId: string, prefix?: string, paddingStr?: string): Promise<string> {
  const ds = await tenantDataSourceFor(tenantId);
  return ds.transaction((manager) =>
    allocateNumber(manager, tenantId, { prefix, padding: paddingStr }),
  );
}
