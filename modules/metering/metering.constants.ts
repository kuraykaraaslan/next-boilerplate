import type { ValueTransformer } from 'typeorm';
import { DEFAULT_CURRENCY as COMMON_DEFAULT_CURRENCY } from '@/modules/common';

/**
 * Default unit of account — the platform default ISO 4217 currency (single
 * sourced from `@/modules/common`). A meter may price in any currency; a
 * billing run is single-currency (it groups the subject's meters by currency
 * and settles the run currency only).
 */
export const DEFAULT_CURRENCY: string = COMMON_DEFAULT_CURRENCY;

/**
 * Quantities and money are stored as integer minor units in `bigint` columns.
 * TypeORM hands `bigint` back as a JS `string`; JS `number` is unsafe past
 * 2^53, so the column value lives as a `BigInt` in memory and a decimal string
 * on the wire. Never let a float touch these columns. (Mirrors the wallet
 * module's transformer exactly.)
 */
export const bigintTransformer: ValueTransformer = {
  to: (value?: bigint | string | null): string | null =>
    value === null || value === undefined ? null : value.toString(),
  from: (value?: string | null): bigint | null =>
    value === null || value === undefined ? null : BigInt(value),
};

/**
 * The billing period key for a moment in time: UTC `YYYY-MM`. Usage is
 * aggregated and billed per calendar month in UTC so the period boundary is
 * deterministic regardless of where the event was recorded.
 */
export function periodKeyFor(at: Date = new Date()): string {
  const y = at.getUTCFullYear();
  const m = at.getUTCMonth() + 1; // 1-12
  return `${y}-${String(m).padStart(2, '0')}`;
}

/**
 * Redis hot-counter key for a meter's current-period running total for one
 * subject. The counter is best-effort (fail-open); the DB events are the
 * authoritative source re-summed by `aggregate`.
 */
export function usageCounterKey(
  tenantId: string,
  meterKey: string,
  periodKey: string,
  subjectId: string | null,
): string {
  return `metering:${tenantId}:${meterKey}:${periodKey}:${subjectId ?? 'TENANT'}`;
}

/** Hot counters expire after this many seconds of inactivity (~70 days). */
export const USAGE_COUNTER_TTL_SECONDS = 70 * 24 * 60 * 60;

/** referenceType stamped on the wallet `spend` posting raised by a billing run. */
export const METERING_BILLING_REFERENCE_TYPE = 'METERING_BILLING';
