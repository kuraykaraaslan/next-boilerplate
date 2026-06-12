import { z } from 'zod'
import { DiscountTypeEnum, CouponStatusEnum } from './coupon.enums'

// ── Entropy helper (GOODTOHAVE: code brute-force prevention) ─────────────────

/**
 * Estimate Shannon entropy (bits) of a string over its character set.
 * A 6-char code from [A-Z0-9] has ~28 bits; we require ≥ 25 bits.
 */
function shannonEntropy(s: string): number {
  const freq: Record<string, number> = {};
  for (const c of s) freq[c] = (freq[c] ?? 0) + 1;
  const len = s.length;
  return Object.values(freq).reduce((sum, count) => {
    const p = count / len;
    return sum - p * Math.log2(p);
  }, 0) * Math.log2(len) / Math.log2(2);
}

const MIN_CODE_ENTROPY_BITS = 25;

// ── Scope ─────────────────────────────────────────────────────────────────────

export const CouponScopeSchema = z.object({
  productIds:              z.array(z.string().uuid()).optional(),
  planIds:                 z.array(z.string().uuid()).optional(),
  categoryIds:             z.array(z.string().uuid()).optional(),
  providers:               z.array(z.string()).optional(),
  appliesTo:               z.enum(['line', 'cart']).optional(),
  minimumAmount:           z.number().nonnegative().optional(),
  /** ISO 4217 currency that `minimumAmount` is expressed in. Required when minimumAmount is set in multi-currency stores. */
  minimumAmountCurrency:   z.string().length(3).transform((v) => v.toUpperCase()).optional(),
  /** ISO 3166-1 alpha-2 country codes this coupon is restricted to. Empty = all countries. */
  countryCodes:            z.array(z.string().length(2).transform((v) => v.toUpperCase())).optional(),
})
export type CouponScope = z.infer<typeof CouponScopeSchema>

// ── Create ────────────────────────────────────────────────────────────────────

export const CreateCouponRequestSchema = z.object({
  code: z
    .string()
    .min(6, 'Code must be at least 6 characters for adequate entropy')
    .max(32)
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, digits, _ or -')
    .transform((v) => v.toUpperCase())
    .refine(
      (v) => shannonEntropy(v) >= MIN_CODE_ENTROPY_BITS,
      'Code is too predictable — use a more varied character set or longer code',
    ),
  name: z.string().min(1),
  /** BCP-47 locale keys, e.g. `{ "tr-TR": "İndirim", "de-DE": "Rabatt" }` */
  nameI18n: z.record(z.string(), z.string()).optional(),
  description: z.string().optional(),
  /** BCP-47 locale keys for localised description */
  descriptionI18n: z.record(z.string(), z.string()).optional(),
  discountType: DiscountTypeEnum,
  discountValue: z.number().positive('Discount value must be positive'),
  currency: z.string().length(3).optional(),
  scope: CouponScopeSchema.nullable().optional(),
  maxUses: z.number().int().positive().optional(),
  maxUsesPerTenant: z.number().int().positive().optional(),
  /** Maximum times a single authenticated user may redeem this coupon. */
  maxUsesPerUser: z.number().int().positive().optional(),
  status: CouponStatusEnum.default('ACTIVE'),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
}).refine(
  (d) => d.discountType === 'FIXED_AMOUNT' ? !!d.currency : true,
  { message: 'Currency is required for fixed amount discounts', path: ['currency'] }
).refine(
  (d) => d.discountType === 'PERCENTAGE' ? d.discountValue <= 100 : true,
  { message: 'Percentage discount cannot exceed 100', path: ['discountValue'] }
)

// ── Update ────────────────────────────────────────────────────────────────────

export const UpdateCouponRequestSchema = z.object({
  name: z.string().min(1).optional(),
  nameI18n: z.record(z.string(), z.string()).nullable().optional(),
  description: z.string().nullable().optional(),
  descriptionI18n: z.record(z.string(), z.string()).nullable().optional(),
  discountType: DiscountTypeEnum.optional(),
  discountValue: z.number().positive().optional(),
  currency: z.string().length(3).nullable().optional(),
  scope: CouponScopeSchema.nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  maxUsesPerTenant: z.number().int().positive().nullable().optional(),
  maxUsesPerUser: z.number().int().positive().nullable().optional(),
  status: CouponStatusEnum.optional(),
  startsAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
})

// ── Query ─────────────────────────────────────────────────────────────────────

export const GetCouponsQuerySchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: CouponStatusEnum.optional(),
  search: z.string().optional(),
})

// ── Validate / Apply ──────────────────────────────────────────────────────────

export const ValidateCouponRequestSchema = z.object({
  code: z.string().min(1).transform((v) => v.toUpperCase()),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  productIds: z.array(z.string().uuid()).optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  provider: z.string().optional(),
  /** ISO 3166-1 alpha-2 country code of the purchaser — used for geo restriction checks. */
  countryCode: z.string().length(2).transform((v) => v.toUpperCase()).optional(),
})

export const ApplyCouponRequestSchema = z.object({
  code: z.string().min(1).transform((v) => v.toUpperCase()),
  tenantId: z.string().uuid(),
  paymentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  planId: z.string().uuid().optional(),
  productIds: z.array(z.string().uuid()).optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  provider: z.string().optional(),
  /** ISO 3166-1 alpha-2 country code — for geo-restriction enforcement. */
  countryCode: z.string().length(2).transform((v) => v.toUpperCase()).optional(),
})

// ── Bulk ──────────────────────────────────────────────────────────────────────

export const BulkCreateCouponRequestSchema = z.object({
  count: z.number().int().min(1).max(10_000, 'Maximum 10 000 codes per batch'),
  prefix: z.string().max(8).regex(/^[A-Z0-9_-]*$/).optional(),
  /** Shared fields applied to all generated coupons */
  name: z.string().min(1),
  discountType: DiscountTypeEnum,
  discountValue: z.number().positive(),
  currency: z.string().length(3).optional(),
  scope: CouponScopeSchema.nullable().optional(),
  maxUsesPerCode: z.number().int().positive().optional(),
  maxUsesPerUser: z.number().int().positive().optional(),
  status: CouponStatusEnum.default('ACTIVE'),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
})

export type BulkCreateCouponDTO = z.infer<typeof BulkCreateCouponRequestSchema>

// ── CSV Row ───────────────────────────────────────────────────────────────────

export const CsvImportRowSchema = z.object({
  code: z.string().min(1).transform((v) => v.trim().toUpperCase()),
  name: z.string().min(1),
  discountType: DiscountTypeEnum,
  discountValue: z.coerce.number().positive(),
  currency: z.string().length(3).optional(),
  maxUses: z.coerce.number().int().positive().optional(),
  maxUsesPerUser: z.coerce.number().int().positive().optional(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  status: CouponStatusEnum.default('ACTIVE'),
})
export type CsvImportRow = z.infer<typeof CsvImportRowSchema>

// ── Type exports ──────────────────────────────────────────────────────────────

export type CreateCouponDTO  = z.infer<typeof CreateCouponRequestSchema>
export type UpdateCouponDTO  = z.infer<typeof UpdateCouponRequestSchema>
export type GetCouponsQuery  = z.infer<typeof GetCouponsQuerySchema>
export type ValidateCouponDTO = z.infer<typeof ValidateCouponRequestSchema>
export type ApplyCouponDTO   = z.infer<typeof ApplyCouponRequestSchema>
