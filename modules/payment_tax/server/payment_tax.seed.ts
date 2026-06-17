import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { TaxClass } from './entities/tax_class.entity';
import { TaxRate } from './entities/tax_rate.entity';

/**
 * Demo data for the `payment_tax` module.
 *
 * Follows the reference seed (`modules/store/store.seed.ts`):
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` (here: the `{ tenantId, code }` of a class and `{ tenantId, name }`
 *    of a rate) so re-runs reuse rows instead of duplicating them.
 *  - Use *valid* tax-class codes only — STANDARD / REDUCED / ZERO / EXEMPT /
 *    DIGITAL (see `payment_tax.enums.ts`).
 *  - Numbers are numbers; the `rate` decimal column is mapped back to `number`
 *    by the entity transformer, so 20.0 means 20%.
 *  - Both entities carry a `tenantId` column → both are tenant-scoped
 *    (`ctx.repo<Entity>(Entity)` + `tenantId: ctx.tenantId`).
 *
 * Models a realistic multi-jurisdiction setup: an EU-style standard/reduced/zero
 * split plus a digital-goods class, with country/region rates that exercise
 * compounding, price-inclusive pricing, priority ordering and active/inactive
 * flags.
 */
export async function seedPaymentTax(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // ── Tax classes (default standard + reduced + zero + digital) ──────────────
  type ClassDef = { name: string; code: string; description: string; isDefault: boolean };
  const classDefs: ClassDef[] = [
    { name: 'Standard',      code: 'STANDARD', description: 'Default rate for most physical goods and services.', isDefault: true },
    { name: 'Reduced',       code: 'REDUCED',  description: 'Reduced rate for essentials such as food and books.', isDefault: false },
    { name: 'Zero-rated',    code: 'ZERO',     description: 'Zero-rated goods (still reportable, but taxed at 0%).', isDefault: false },
    { name: 'Digital Goods', code: 'DIGITAL',  description: 'Digital services taxed at the customer destination.',  isDefault: false },
  ];

  const taxClassRepo = ctx.repo<TaxClass>(TaxClass);
  const classes: Record<string, TaxClass> = {};
  for (const def of classDefs) {
    classes[def.code] = await foc(taxClassRepo,
      { tenantId, code: def.code } as FindOptionsWhere<TaxClass>,
      { tenantId, name: def.name, code: def.code, description: def.description, isDefault: def.isDefault },
    );
  }

  // ── Tax rates (multi-jurisdiction, varied flags & priorities) ──────────────
  // Covers: country-scoped standard rates, a region override, a price-inclusive
  // EU rate, a compounded surcharge, a class-agnostic rate (taxClassId = null),
  // and one inactive draft to exercise the isActive filter.
  type RateDef = {
    name: string;
    taxClassId?: string;
    countryCode?: string;
    region?: string;
    postalCodePattern?: string;
    rate: number;
    isCompound: boolean;
    includedInPrice: boolean;
    priority: number;
    isActive: boolean;
  };
  const rateDefs: RateDef[] = [
    // Turkey KDV 20% — price-inclusive standard rate.
    { name: 'TR KDV %20',             taxClassId: classes.STANDARD.taxClassId, countryCode: 'TR',                rate: 20,    isCompound: false, includedInPrice: true,  priority: 0,  isActive: true },
    // Turkey KDV 1% — reduced rate for staples.
    { name: 'TR KDV %1',              taxClassId: classes.REDUCED.taxClassId,  countryCode: 'TR',                rate: 1,     isCompound: false, includedInPrice: true,  priority: 0,  isActive: true },
    // Germany MwSt 19% — standard, tax-exclusive.
    { name: 'DE MwSt 19%',            taxClassId: classes.STANDARD.taxClassId, countryCode: 'DE',                rate: 19,    isCompound: false, includedInPrice: false, priority: 0,  isActive: true },
    // Germany reduced 7% — books, food.
    { name: 'DE MwSt 7%',             taxClassId: classes.REDUCED.taxClassId,  countryCode: 'DE',                rate: 7,     isCompound: false, includedInPrice: false, priority: 0,  isActive: true },
    // US California state sales tax — region-scoped, exclusive.
    { name: 'US CA Sales Tax 7.25%', taxClassId: classes.STANDARD.taxClassId, countryCode: 'US', region: 'CA',  rate: 7.25,  isCompound: false, includedInPrice: false, priority: 0,  isActive: true },
    // US California district surcharge — compounded on top of state tax, postal-scoped.
    { name: 'US CA District +1.5%',  taxClassId: classes.STANDARD.taxClassId, countryCode: 'US', region: 'CA', postalCodePattern: '900', rate: 1.5, isCompound: true, includedInPrice: false, priority: 10, isActive: true },
    // EU digital VAT (Ireland) — destination-based digital goods rate.
    { name: 'IE Digital VAT 23%',    taxClassId: classes.DIGITAL.taxClassId,  countryCode: 'IE',                rate: 23,    isCompound: false, includedInPrice: true,  priority: 0,  isActive: true },
    // Zero-rated export — explicit 0% so it still appears on the breakdown.
    { name: 'Export Zero-rated',     taxClassId: classes.ZERO.taxClassId,                                       rate: 0,     isCompound: false, includedInPrice: false, priority: 0,  isActive: true },
    // Country-wide eco surcharge — applies to ALL classes (taxClassId null).
    { name: 'FR Eco Surcharge 2%',                                            countryCode: 'FR',                rate: 2,     isCompound: true,  includedInPrice: false, priority: 5,  isActive: true },
    // Inactive draft rate — exercises the isActive=false path.
    { name: 'UK VAT 20% (draft)',    taxClassId: classes.STANDARD.taxClassId, countryCode: 'GB',                rate: 20,    isCompound: false, includedInPrice: true,  priority: 0,  isActive: false },
  ];

  const taxRateRepo = ctx.repo<TaxRate>(TaxRate);
  let firstRateId: string | undefined;
  let defaultStandardRateId: string | undefined;
  for (const def of rateDefs) {
    const rate = await foc(taxRateRepo,
      { tenantId, name: def.name } as FindOptionsWhere<TaxRate>,
      { tenantId, ...def },
    );
    firstRateId ??= rate.taxRateId;
    if (def.name === 'TR KDV %20') defaultStandardRateId = rate.taxRateId;
  }

  // ── Publish references other modules might consume ─────────────────────────
  refs.taxClassId = classes.STANDARD.taxClassId;
  refs.taxRateId = defaultStandardRateId ?? firstRateId;

  ctx.log(`payment_tax: ${classDefs.length} tax classes, ${rateDefs.length} tax rates for ${tenantId}`);
}
