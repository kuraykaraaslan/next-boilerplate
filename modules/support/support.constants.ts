import type { TicketPriority } from './support.enums';

/**
 * Support-ticket constants: the SLA-by-priority map and the ticket-number
 * format.
 */

/** SLA target (hours-to-first-response) per support-ticket priority. */
export const TICKET_SLA_HOURS: Readonly<Record<TicketPriority, number>> = {
  LOW: 72,
  NORMAL: 48,
  HIGH: 24,
  URGENT: 4,
} as const;

/** Resolve the SLA due-date for a ticket given its priority. */
export function ticketSlaDueAt(priority: TicketPriority, from: Date = new Date()): Date {
  return new Date(from.getTime() + TICKET_SLA_HOURS[priority] * 60 * 60 * 1000);
}

/** Prefix for generated ticket numbers (e.g. `TICK-2026-00001`). */
export const TICKET_NUMBER_PREFIX = 'TICK';

/** Zero-padding width for the per-year ticket sequence. */
export const TICKET_NUMBER_PADDING = 5;
