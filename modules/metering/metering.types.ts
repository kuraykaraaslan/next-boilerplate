import { z } from 'zod';
import {
  BillingRunStatusEnum,
  MeterAggregationEnum,
  SubjectTypeEnum,
} from './metering.enums';

/**
 * Minor-unit quantities / money cross the wire as decimal strings. The entities
 * hold a `BigInt` (via the column transformer); these schemas accept either a
 * BigInt or a string and normalize to string so `JSON.stringify` never chokes
 * on a raw BigInt (mirrors the wallet module).
 */
const BigIntString = z
  .union([z.bigint(), z.string()])
  .transform((v) => v.toString());

export const MeterDefinitionSchema = z.object({
  meterId: z.string().uuid(),
  tenantId: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  unit: z.string(),
  aggregation: MeterAggregationEnum,
  unitPriceMinor: BigIntString,
  currency: z.string(),
  includedQuantity: BigIntString,
  active: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type MeterDefinition = z.infer<typeof MeterDefinitionSchema>;

export const MeteredUsageEventSchema = z.object({
  usageEventId: z.string().uuid(),
  tenantId: z.string().uuid(),
  meterId: z.string().uuid(),
  meterKey: z.string(),
  subjectType: SubjectTypeEnum,
  subjectId: z.string().uuid().nullable(),
  quantity: BigIntString,
  idempotencyKey: z.string().nullable(),
  occurredAt: z.date(),
  periodKey: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
});
export type MeteredUsageEvent = z.infer<typeof MeteredUsageEventSchema>;

export const MeteredBillingRunLineSchema = z.object({
  meterKey: z.string(),
  usedQuantity: z.string(),
  includedQuantity: z.string(),
  billableQuantity: z.string(),
  unitPriceMinor: z.string(),
  amountMinor: z.string(),
});
export type MeteredBillingRunLine = z.infer<typeof MeteredBillingRunLineSchema>;

export const MeteredBillingRunSchema = z.object({
  billingRunId: z.string().uuid(),
  tenantId: z.string().uuid(),
  subjectType: SubjectTypeEnum,
  subjectId: z.string().uuid().nullable(),
  periodKey: z.string(),
  status: BillingRunStatusEnum,
  lines: z.array(MeteredBillingRunLineSchema).nullable(),
  currency: z.string(),
  totalMinor: BigIntString,
  walletDebitedMinor: BigIntString,
  invoicedMinor: BigIntString,
  walletTransactionId: z.string().uuid().nullable(),
  invoiceId: z.string().uuid().nullable(),
  idempotencyKey: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.date(),
});
export type MeteredBillingRun = z.infer<typeof MeteredBillingRunSchema>;

/** The result of `computeOverage` — what a run *would* settle, before posting. */
export interface OverageComputation {
  currency: string;
  lines: MeteredBillingRunLine[];
  totalMinor: string;
}

/** A single per-meter current-period usage reading (`getUsage`). */
export interface MeterUsageReading {
  meterKey: string;
  meterId: string;
  name: string;
  unit: string;
  aggregation: string;
  periodKey: string;
  usedQuantity: string;
  includedQuantity: string;
  source: 'redis' | 'db';
}
