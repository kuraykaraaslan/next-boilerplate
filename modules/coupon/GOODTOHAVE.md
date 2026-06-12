# Good to Have — Coupon

> All items shipped.

## Geographic Restriction

### ✅ Geo-Restricted Coupons
`CouponScopeSchema.countryCodes` — ISO 3166-1 alpha-2 allow-list. `CouponValidationService.scopeApplies` checks `ctx.countryCode`. `ValidateCouponDTO` and `ApplyCouponDTO` accept `countryCode`.

### ✅ Currency-Aware Minimum Amount
`CouponScopeSchema.minimumAmountCurrency` pairs with `minimumAmount`. `scopeApplies` skips the threshold check when currencies differ (cross-currency comparison requires FX rates out of scope here).

---

## Per-Tenant Limits and Quotas

### ✅ Max-Uses-Per-User Gate
`Coupon.maxUsesPerUser` (INT nullable). `CouponValidationService.validate` calls `CouponCrudService.getRedemptionCountByUser` when `userId` is present.

### ✅ Per-Plan-Tier Coupon Quotas
`CouponCrudService.checkPlanQuota` reads the `couponMaxActive` tenant setting and throws `PLAN_QUOTA_EXCEEDED` when the active coupon count reaches the limit.

---

## Provider Sync

### ✅ Per-Tenant Stripe Connect Sync
`StripeCouponProvider.resolveApiKey` checks `stripeConnectSecretKey` on the tenant before falling back to the platform's `stripeSecretKey`. Both `syncCoupon` and `getCheckoutCouponParam` accept `tenantId`.

### ✅ PayPal and Iyzico Native Discount Line Items
`PaypalCouponProvider.getCheckoutCouponParam` returns a `paypal_discount_item` (Orders v2 negative line item).
`IyzicoCouponProvider.getCheckoutCouponParam` returns an `iyzico_discount_item` (negative-priced VIRTUAL basket item).

---

## Bulk and Campaign Operations

### ✅ Bulk Coupon Generation
`CouponCrudService.bulkCreate` — up to 10 000 unique codes per batch via CSPRNG (6 bytes → `[A-Z2-9]^8`). Single DB batch insert.

### ✅ Coupon Import via CSV
`CouponCrudService.importFromCsv` — parses CSV string, validates rows via `CsvImportRowSchema`, skips duplicates, returns `{ imported, skipped, errors }`.

---

## Analytics and Reporting

### ✅ Per-Coupon Analytics Dashboard
`CouponCrudService.getAnalytics` — `usedCount`, `redemptionRate`, `totalDiscountAmount`, `totalRevenueAfterDiscount`, `uniqueUsers`, and `redemptionsByDay` (last 30 days) via DB aggregation.

### ✅ Coupon Revenue Attribution
`CouponCrudService.getRevenueAttribution` — groups `CouponRedemption` by currency; returns `totalPayments`, `totalOriginalAmount`, `totalDiscountAmount`, `totalFinalAmount`.

---

## Validation Robustness

### ✅ Race-Condition-Safe `maxUses` Enforcement
`CouponValidationService.apply` issues a conditional `UPDATE ... SET usedCount = usedCount + 1 WHERE usedCount < maxUses` inside the transaction. 0 affected rows → `MAX_USES_REACHED`.

### ✅ Coupon Code Entropy Validation
`CreateCouponRequestSchema` enforces `min(6)` and a Shannon-entropy check (≥ 25 bits).

---

## Localisation

### ✅ Localised Coupon Names and Descriptions
`Coupon.nameI18n` and `Coupon.descriptionI18n` — JSONB columns (`Record<BCP-47, string>`). In DTO, entity, schema, and CRUD service.
