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

- `TaxClass` (system) — `modules/payment_tax/entities/tax_class.entity.ts`
- `TaxRate` (system) — `modules/payment_tax/entities/tax_rate.entity.ts`

## README

# payment_tax module

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
| `entities/tax_class.entity.ts` | `TaxClass` — table `tax_classes` (soft-deletable) |
| `entities/tax_rate.entity.ts` | `TaxRate` — table `tax_rates` |

---

## Entities

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
| `countryCode` | ISO-2, nullable — **null = any country** |
| `region` | state/province, nullable — null = any region |
| `postalCodePattern` | regex or prefix, nullable — null = any postal code |
| `rate` | decimal(6,4) percentage — `20.0000` = 20% |
| `isCompound` | bool — compounded on top of prior taxes |
| `includedInPrice` | bool — supplied amount is tax-inclusive (gross) |
| `priority` | int — **lower applies first** |
| `isActive` | bool |
| `createdAt` / `updatedAt` | — |

---

## Service methods

| Method | Returns | Notes |
|---|---|---|
| `createClass(tenantId, dto)` | `SafeTaxClass` | unsets other defaults when `isDefault` |
| `updateClass(tenantId, classId, dto)` | `SafeTaxClass` | promoting to default demotes others |
| `listClasses(tenantId)` | `SafeTaxClass[]` | default first, then by name |
| `deleteClass(tenantId, classId)` | `void` | soft delete |
| `createRate(tenantId, dto)` | `TaxRate` | |
| `updateRate(tenantId, rateId, dto)` | `TaxRate` | invalidates cache |
| `getRate(tenantId, rateId)` | `TaxRate` | single-flight cached |
| `listRates(tenantId, query)` | `{ data, total }` | filter by country/class/active |
| `deleteRate(tenantId, rateId)` | `void` | hard delete |
| `calculateTax(tenantId, dto)` | `TaxCalculationResult` | the core engine (below) |

---

## Calculation algorithm

For each input line:

1. **Resolve class** — look up by `taxClassCode`, else fall back to the tenant's
   default class.
2. **Select rates** — an active rate matches when:
   - `countryCode` is null OR equals `destination.countryCode`, **and**
   - `region` is null OR equals `destination.region`, **and**
   - `postalCodePattern` is null OR matches `destination.postalCode` (regex,
     falling back to prefix match), **and**
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
   values are rounded to 2 decimals via `round2`.

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

## Dependencies

`db`, `env`, `redis`, `logger`. Currency is a plain 3-letter string (default
`USD`); this module does **not** depend on `payment_core`.

## Cache keys

| Key | Written by | Invalidated by |
|---|---|---|
| `pay:tax:<rateId>` | `getRate()` (single-flight) | `updateRate()`, `deleteRate()` |
