import { z } from 'zod';

/**
 * Metering enums.
 *
 * The metering module is event-based: callers record immutable
 * `MeteredUsageEvent` rows against a `MeterDefinition`. A meter's
 * `aggregation` decides how its events collapse into a single period total,
 * and a `MeteredBillingRun` settles the overage above the meter's free
 * allowance.
 */

// How a meter's events collapse into one period total.
//  - SUM:  add every event quantity (default — API calls, bytes, …)
//  - MAX:  the highest single reading in the period (peak seats, peak GB)
//  - LAST: the most recent reading by occurredAt (a gauge / current value)
export const MeterAggregationEnum = z.enum(['SUM', 'MAX', 'LAST']);
export type MeterAggregation = z.infer<typeof MeterAggregationEnum>;

// What a usage event (and a billing run) is attributed to.
export const SubjectTypeEnum = z.enum(['TENANT', 'USER', 'SUBSCRIPTION']);
export type SubjectType = z.infer<typeof SubjectTypeEnum>;

// Lifecycle of a billing run.
//
// Two overlapping shapes share the same column:
//  - The legacy one-shot settlement (`runBilling`) writes PENDING → COMPLETED |
//    FAILED in a single call.
//  - The document workflow (`createRun` → `calculate` → `bill`) drives
//    DRAFT → CALCULATED → BILLED so a run can be reviewed before it charges.
export const BillingRunStatusEnum = z.enum([
  'PENDING',
  'COMPLETED',
  'FAILED',
  'DRAFT',
  'CALCULATED',
  'BILLED',
]);
export type BillingRunStatus = z.infer<typeof BillingRunStatusEnum>;
