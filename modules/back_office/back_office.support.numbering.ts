import 'reflect-metadata';
import { type EntityManager } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { SupportTicket as SupportTicketEntity } from './entities/support_ticket.entity';
import {
  TICKET_NUMBER_PADDING,
  TICKET_NUMBER_PREFIX,
} from './back_office.constants';

/**
 * Allocate the next per-tenant, per-year ticket number inside an existing
 * transaction. Mirrors `InvoiceCrudService.allocateNumber`: a Postgres
 * advisory xact lock serializes concurrent allocations for the same
 * (tenant, year) prefix so two creates can't read the same MAX and collide on
 * the unique `(tenantId, ticketNumber)` index. Format: `TICK-2026-00001`.
 */
export async function allocateTicketNumber(
  manager: EntityManager,
  tenantId: string,
  at: Date = new Date(),
): Promise<string> {
  const year = at.getUTCFullYear();
  const search = `${TICKET_NUMBER_PREFIX}-${year}-`;

  // Postgres path: serialize on the (tenant, prefix) key. The fake DataSource
  // used in tests has no `query`, so this is best-effort.
  if (typeof manager.query === 'function') {
    try {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [
        `tick:${tenantId}:${search}`,
      ]);
    } catch {
      // non-Postgres / test stub — the unique index + retry still guard us
    }
  }

  const row = await manager
    .getRepository(SupportTicketEntity)
    .createQueryBuilder('t')
    .select('t.ticketNumber', 'ticketNumber')
    .where('t.tenantId = :tid', { tid: tenantId })
    .andWhere('t.ticketNumber LIKE :prefix', { prefix: `${search}%` })
    .orderBy('LENGTH(t.ticketNumber)', 'DESC')
    .addOrderBy('t.ticketNumber', 'DESC')
    .limit(1)
    .getRawOne<{ ticketNumber: string }>()
    .catch(() => null);

  const lastSeq = row?.ticketNumber ? parseInt(row.ticketNumber.split('-').pop() ?? '0', 10) : 0;
  const next = (lastSeq + 1).toString().padStart(TICKET_NUMBER_PADDING, '0');
  return `${search}${next}`;
}

/** Standalone allocator (its own transaction). */
export async function getNextTicketNumber(tenantId: string): Promise<string> {
  const ds = await tenantDataSourceFor(tenantId);
  return ds.transaction((manager) => allocateTicketNumber(manager, tenantId));
}
