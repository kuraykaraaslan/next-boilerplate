import { z } from 'zod';
import { MeterAggregationEnum, SubjectTypeEnum } from './metering.enums';

/**
 * Non-negative integer minor-unit amount (price / allowance) carried as a
 * decimal string (bigint-safe). Zero is allowed (e.g. a free meter, no
 * allowance).
 */
const NonNegAmountString = z
  .string()
  .regex(/^\d+$/, 'Amount must be a non-negative integer (minor units)');

/** A strictly positive minor-unit quantity (a usage event must move something). */
const PositiveQtyString = z
  .string()
  .regex(/^\d+$/, 'Quantity must be a non-negative integer (minor units)')
  .refine((v) => /^\d+$/.test(v) && BigInt(v) > BigInt(0), 'Quantity must be greater than zero');

const CurrencyCode = z
  .string()
  .min(1)
  .max(12)
  .transform((v) => v.toUpperCase());

const MeterKey = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, 'Meter key must be lowercase alphanumeric / underscore');

const PeriodKey = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'periodKey must be YYYY-MM');

// ──────────────────────────────────────────────
// Meter CRUD
// ──────────────────────────────────────────────

export const CreateMeterDTO = z.object({
  key: MeterKey,
  name: z.string().min(1).max(128),
  unit: z.string().min(1).max(32),
  aggregation: MeterAggregationEnum.default('SUM'),
  unitPriceMinor: NonNegAmountString.default('0'),
  currency: CurrencyCode.optional(),
  includedQuantity: NonNegAmountString.default('0'),
  active: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateMeterDTO = z.infer<typeof CreateMeterDTO>;

export const UpdateMeterDTO = z.object({
  name: z.string().min(1).max(128).optional(),
  unit: z.string().min(1).max(32).optional(),
  aggregation: MeterAggregationEnum.optional(),
  unitPriceMinor: NonNegAmountString.optional(),
  currency: CurrencyCode.optional(),
  includedQuantity: NonNegAmountString.optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type UpdateMeterDTO = z.infer<typeof UpdateMeterDTO>;

export const ListMetersQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  // Query strings arrive as text; treat 'false'/'0'/'' as false rather than
  // coercing every non-empty string to true (z.coerce.boolean would do that).
  active: z
    .preprocess((v) => (typeof v === 'string' ? !['false', '0', ''].includes(v.toLowerCase()) : v), z.boolean())
    .optional(),
  q: z.string().optional(),
});
export type ListMetersQuery = z.infer<typeof ListMetersQuery>;

// ──────────────────────────────────────────────
// Usage recording / reads
// ──────────────────────────────────────────────

export const RecordUsageDTO = z.object({
  meterKey: MeterKey,
  quantity: PositiveQtyString,
  subjectType: SubjectTypeEnum.default('TENANT'),
  subjectId: z.string().uuid().optional(),
  occurredAt: z.string().datetime().optional(),
  idempotencyKey: z.string().max(128).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type RecordUsageDTO = z.infer<typeof RecordUsageDTO>;

export const GetUsageQuery = z.object({
  meterKey: MeterKey.optional(),
  subjectType: SubjectTypeEnum.optional(),
  subjectId: z.string().uuid().optional(),
  periodKey: PeriodKey.optional(),
});
export type GetUsageQuery = z.infer<typeof GetUsageQuery>;

// ──────────────────────────────────────────────
// Billing
// ──────────────────────────────────────────────

/**
 * Optional customer details used only when the run has to invoice a remainder
 * (the wallet did not cover the whole overage). Required by the invoice module
 * for a real, issuable draft.
 */
const InvoiceCustomer = z.object({
  customerEmail: z.string().email().optional(),
  customerName: z.string().min(1).optional(),
  customerCountryCode: z.string().length(2).optional(),
});

export const RunBillingDTO = InvoiceCustomer.extend({
  subjectType: SubjectTypeEnum.default('TENANT'),
  subjectId: z.string().uuid().optional(),
  periodKey: PeriodKey,
  // The wallet owner to debit prepaid credits from. Defaults to subjectId when
  // the subject is a USER. Required to use the wallet rail for non-USER
  // subjects (TENANT / SUBSCRIPTION usage billed to a specific user's wallet).
  walletUserId: z.string().uuid().optional(),
  idempotencyKey: z.string().max(128).optional(),
});
export type RunBillingDTO = z.infer<typeof RunBillingDTO>;

/**
 * Open a new billing-run *document* in DRAFT. No usage is read and nothing is
 * charged yet — `calculate` derives the lines, `bill` settles them. Mirrors a
 * sales-order opening empty before its lines/workflow.
 */
export const CreateRunDTO = z.object({
  subjectType: SubjectTypeEnum.default('TENANT'),
  subjectId: z.string().uuid().optional(),
  periodKey: PeriodKey,
});
export type CreateRunDTO = z.infer<typeof CreateRunDTO>;

/**
 * The `bill` transition's customer / wallet details — same shape `runBilling`
 * needs to settle the remainder, but supplied at bill-time on a CALCULATED run.
 */
export const BillRunDTO = InvoiceCustomer.extend({
  walletUserId: z.string().uuid().optional(),
});
export type BillRunDTO = z.infer<typeof BillRunDTO>;

export const ListRunsQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  subjectId: z.string().uuid().optional(),
  periodKey: PeriodKey.optional(),
  status: z.string().optional(),
});
export type ListRunsQuery = z.infer<typeof ListRunsQuery>;
