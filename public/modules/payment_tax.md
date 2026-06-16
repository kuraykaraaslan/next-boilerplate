# Payment Tax

- **id:** `payment_tax`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/payment_tax/`
- **tags:** payment, tax, vat, compliance
- **icon:** `fas fa-percent`
- **hasNextLayer:** false

Tenant-aware tax/VAT calculation engine: tax classes, destination-matched rates, compound and price-inclusive computation.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`

## Services

- `payment_tax.calc.service.ts`
- `payment_tax.crud.service.ts`
- `payment_tax.report.service.ts`
- `payment_tax.service.ts`

## DTOs

- `payment_tax.dto.ts`

## Entities

- `tax_class.entity.ts`
- `tax_rate.entity.ts`

## Enums

- `payment_tax.enums.ts`

## Message keys

- `payment_tax.messages.ts`

## TypeORM entities

- `TaxClass` (system) — `modules/payment_tax/server/entities/tax_class.entity.ts`
- `TaxRate` (system) — `modules/payment_tax/server/entities/tax_rate.entity.ts`

## README

# Payment Tax Module

A tenant-scoped **tax / VAT calculation engine**. Each tenant defines its own
**tax classes** (Standard, Reduced, Zero, Digital Goods…) and **tax rates**
matched by destination (country / region / postal code). The core
`calculateTax()` method resolves the right rates for each line and computes net,
tax, and gross totals — supporting **priority ordering**, **compound taxes**, and
**price-inclusive** rates.

This module is framework-agnostic: no `next/*`, no `react`, no browser APIs.

---

## Files

| File | Purpose |
|---|---|
| `payment_tax.service.ts` | `PaymentTaxService` — class & rate CRUD + the `calculateTax()` engine |
| `payment_tax.types.ts` | Zod schemas + inferred types (entities + calculation result shapes) |
| `payment_tax.dto.ts` | Input DTOs (create/update/query/calculate) |
| `payment_tax.enums.ts` | `TaxClassCodeEnum` (`STANDARD`/`REDUCED`/`ZERO`/`EXEMPT`/`DIGITAL`) |
| `payment_tax.messages.ts` | Flat error strings (`PAYMENT_TAX_MESSAGES`) |
| `payment_tax.seed.ts` | `seedPaymentTax()` — demo classes + multi-jurisdiction rates |
| `entities/tax_class.entity.ts` | `TaxClass` — table `tax_classes` (soft-deletable) |
| `entities/tax_rate.entity.ts` | `TaxRate` — table `tax_rates` |

---

## Entities

Both entities live in the **tenant DB** (every row carries `tenantId`, and all
reads/writes go through `tenantDataSourceFor(tenantId)`).

| Entity | Table | Description |
|---|---|---|
| `TaxClass` | `tax_classes` | Tax category per tenant (soft-deletable) |
| `TaxRate` | `tax_rates` | Destination-matched rate per tenant |

### `tax_classes`
| Column | Notes |
|---|---|
| `taxClassId` | uuid pk |
| `tenantId` | uuid, indexed |
| `name` | e.g. `Standard`, `Digital Goods` |
| `code` | indexed machine code, e.g. `STANDARD` |
| `description` | text, nullable |
| `isDefault` | bool — applied to lines with no `taxClassCode` (one per tenant) |
| `createdAt` / `updatedAt` / `deletedAt` | soft delete |

### `tax_rates`
| Column | Notes |
|---|---|
| `taxRateId` | uuid pk |
| `tenantId` | uuid, indexed |
| `taxClassId` | uuid, indexed, nullable — **null = applies to all classes** |
| `name` | e.g. `TR KDV %20` |
| `countryCode` | ISO-2, indexed, nullable — **null = any country** |
| `region` | state/province, nullable — null = any region |
| `postalCodePattern` | regex or prefix, nullable — null = any postal code |
| `rate` | decimal(6,4) percentage — `20.0000` = 20% |
| `isCompound` | bool — compounded on top of prior taxes |
| `includedInPrice` | bool — supplied amount is tax-inclusive (gross) |
| `priority` | int, indexed — **lower applies first** |
| `isActive` | bool, indexed |
| `createdAt` / `updatedAt` | — |

---

## Service methods

`PaymentTaxService` exposes static methods; every query is scoped by `tenantId`
on the per-tenant DataSource.

| Method | Returns | Notes |
|---|---|---|
| `createClass(tenantId, dto)` | `SafeTaxClass` | unsets other defaults when `isDefault` |
| `updateClass(tenantId, classId, dto)` | `SafeTaxClass` | promoting to default demotes others |
| `listClasses(tenantId)` | `SafeTaxClass[]` | default first, then by name |
| `deleteClass(tenantId, classId)` | `void` | soft delete |
| `createRate(tenantId, dto)` | `TaxRate` | |
| `updateRate(tenantId, rateId, dto)` | `TaxRate` | invalidates cache |
| `getRate(tenantId, rateId)` | `TaxRate` | single-flight cached |
| `listRates(tenantId, query)` | `{ data, total }` | filter by country/class/active; paged |
| `deleteRate(tenantId, rateId)` | `void` | hard delete |
| `calculateTax(tenantId, dto)` | `TaxCalculationResult` | the core engine (below) |

`calculateTax()` wraps the private `runCalculation()`; on any error it logs and
throws `CALCULATION_FAILED`.

---

## Calculation algorithm

For each input line:

1. **Resolve class** — look up by `taxClassCode`, else fall back to the tenant's
   default class.
2. **Select rates** — an active rate matches when:
   - `countryCode` is null OR equals `destination.countryCode`, **and**
   - `region` is null OR equals `destination.region`, **and**
   - `postalCodePattern` is null OR matches `destination.postalCode` (regex,
     falling back to prefix match; an unset destination postal code fails a set
     pattern), **and**
   - `taxClassId` is null (global) OR equals the resolved class id.
3. **Order** matching rates by `priority` ascending (lower first).
4. **Compute** per line, with `lineNet = amount * quantity`:
   - **Exclusive** (`includedInPrice = false`): tax is added on top.
     - non-compound: `tax = lineNet * rate%`
     - compound: `tax = (lineNet + Σ prior taxes) * rate%`
   - **Inclusive** (`includedInPrice = true`): the amount is **gross**. We back
     out the net: `net = gross / (1 + rate/100)`, `tax = gross − net`, and reduce
     the line's reported net accordingly so `gross == net + tax`.
5. Sum line taxes → `TaxCalculationLine`, then aggregate to totals. All monetary
   values are rounded to 2 decimals via `round2` (half-up).

### Worked example

Destination `TR`, one line: `amount = 100`, `quantity = 1`, class `STANDARD`.
Two matching active rates ordered by priority:

| priority | name | rate | compound | inclusive |
|---|---|---|---|---|
| 0 | KDV | 20% | no | no |
| 1 | Eco fee | 5% | yes | no |

- KDV: `100 * 20% = 20.00`
- Eco fee (compound): `(100 + 20) * 5% = 6.00`
- **netAmount** `100.00`, **taxAmount** `26.00`, **grossAmount** `126.00`

If KDV were `includedInPrice` instead (amount `120` gross, 20%):
`net = 120 / 1.20 = 100.00`, `tax = 20.00` → net `100.00`, gross `120.00`.

---

## Cache keys

| Key | Written by | Invalidated by |
|---|---|---|
| `pay:tax:<rateId>` | `getRate()` (single-flight) | `updateRate()`, `deleteRate()` |

---

## Settings

None. This module has no per-tenant or system settings keys — all behavior is
driven by the tenant's own `tax_classes` and `tax_rates` rows.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A tenant-aware tax/VAT calculation engine where every tenant defines its own tax classes and destination-matched rates in its own DB, and all reads/writes go through tenantDataSourceFor(tenantId) — fully per-tenant with no settings or root/system surface.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `TaxClass` | `tax_classes` | name, code, description, isDefault |
| `TaxRate` | `tax_rates` | taxClassId, name, countryCode, region, postalCodePattern, rate, isCompound, includedInPrice, priority, isActive |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `payment_tax.service.ts:runCalculation` — The entire tax computation is driven by the requesting tenant's own rows: it loads that tenant's tax classes (resolving the line's class by taxClassCode, falling back to the tenant's isDefault class) and all of that tenant's active TaxRate rows, then per line selects/orders rates by the tenant's countryCode/region/postalCodePattern/taxClassId/priority and applies that tenant's isCompound and includedInPrice flags. Two tenants in the same country can therefore produce different tax breakdowns.
- `payment_tax.service.ts:createClass` — Enforces a single default tax class per tenant by demoting any existing isDefault row scoped to {tenantId, isDefault:true} before inserting; the default class is what runCalculation falls back to for lines without a taxClassCode, so the per-tenant default determines untyped-line taxation.
- `payment_tax.service.ts:listRates` — All CRUD/list/get methods scope every query by where:{tenantId,...} and operate on tenantDataSourceFor(tenantId), so each tenant only ever sees and mutates its own tax classes and rates.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Monetary rounding is hardcoded to 2 decimal places with implicit half-up Number rounding for all tenants and currencies | `payment_tax.service.ts:round2` | round2() always multiplies by 100 and Math.round()s, so zero-decimal currencies (e.g. JPY) and tenants needing bankers'/half-even rounding for tax compliance cannot be accommodated; rounding precision/mode is a plausible per-tenant (or per-currency) tax-policy setting rather than a global constant. | `taxRoundingPrecision` |
| The canonical tax-class code set (STANDARD/REDUCED/ZERO/EXEMPT/DIGITAL) recognised by the engine is a fixed global enum | `payment_tax.enums.ts:TaxClassCodeEnum` | Tenants can create additional classes as rows, but the well-known codes the calculation/validation layer recognises are a hardcoded enum shared by all tenants; jurisdictions with different canonical class taxonomies cannot extend the recognised code list per tenant. Likely acceptable as a shared baseline, but noting it as a global value that could plausibly be tenant-configurable. | — |

---

## Dependencies

`db`, `env`, `redis`, `logger`. Currency is a plain 3-letter string (default
`USD`); this module does **not** depend on `payment_core`.
