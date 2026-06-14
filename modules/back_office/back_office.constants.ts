import { createHash } from 'node:crypto';
import type { TicketPriority } from './back_office.enums';

/**
 * Back-office constants: the tamper-evident hash-chain helper (copied from the
 * audit_log / wallet canonical hashing so decision records verify the same
 * way) and the SLA-by-priority maps.
 */

/**
 * Immutable insert-time content hashed into the per-tenant approval chain. Only
 * fields that never change after submit participate, so the chain is genuinely
 * append-only (like audit_log / wallet) and is not invalidated by later claim /
 * decide mutations. The decision audit trail itself is the append-only
 * `audit_log` (written on every decision via `AuditLogService.log`).
 */
export interface ApprovalHashRow {
  approvalItemId: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  submittedByUserId: string | null;
  priority: number;
  reason: string | null;
  createdAt: Date;
}

/**
 * Deterministic SHA-256 over the canonical row content chained to `prevHash`.
 * Mirrors `AuditLogService.computeRowHash` / `WalletCrudService.computeRowHash`:
 * `rowHash = sha256(prevHash + canonical(row))` and `prevHash` is the previous
 * approval item's rowHash for the SAME tenant (null for the first row). Any
 * after-the-fact edit to a chained field breaks the chain at that row.
 */
export function computeRowHash(prevHash: string | null, row: ApprovalHashRow): string {
  const canonical = JSON.stringify({
    approvalItemId: row.approvalItemId,
    tenantId: row.tenantId,
    entityType: row.entityType,
    entityId: row.entityId,
    submittedByUserId: row.submittedByUserId,
    priority: row.priority,
    reason: row.reason,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  });
  return createHash('sha256').update((prevHash ?? '') + canonical).digest('hex');
}

/**
 * SLA target (hours-to-first-resolution) per approval priority bucket. A higher
 * numeric `priority` is more urgent; `slaDueAt` is computed as
 * `now + APPROVAL_SLA_HOURS[bucket]`. Unmapped priorities fall back to the
 * default bucket.
 */
export const APPROVAL_SLA_HOURS: Readonly<Record<number, number>> = {
  0: 72, // routine
  1: 48, // elevated
  2: 24, // high
  3: 8, // urgent
} as const;

/** Default SLA window (hours) for an approval priority not present in the map. */
export const APPROVAL_DEFAULT_SLA_HOURS = 72;

/** SLA target (hours-to-first-response) per support-ticket priority. */
export const TICKET_SLA_HOURS: Readonly<Record<TicketPriority, number>> = {
  LOW: 72,
  NORMAL: 48,
  HIGH: 24,
  URGENT: 4,
} as const;

/**
 * Resolve the SLA due-date for an approval item given its (clamped) priority.
 * Returns `null` only when `now` is invalid, which never happens in practice.
 */
export function approvalSlaDueAt(priority: number, from: Date = new Date()): Date {
  const hours = APPROVAL_SLA_HOURS[priority] ?? APPROVAL_DEFAULT_SLA_HOURS;
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

/** Resolve the SLA due-date for a ticket given its priority. */
export function ticketSlaDueAt(priority: TicketPriority, from: Date = new Date()): Date {
  return new Date(from.getTime() + TICKET_SLA_HOURS[priority] * 60 * 60 * 1000);
}

/** Prefix for generated ticket numbers (e.g. `TICK-2026-00001`). */
export const TICKET_NUMBER_PREFIX = 'TICK';

/** Zero-padding width for the per-year ticket sequence. */
export const TICKET_NUMBER_PADDING = 5;
