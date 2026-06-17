import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { ShippingMethod } from './entities/shipping_method.entity';
import { ShippingRate } from './entities/shipping_rate.entity';

/**
 * payment_shipping demo seed.
 *
 * Both entities carry a `tenantId` column, so everything here is tenant-scoped
 * via `ctx.repo(...)`. Natural keys mirror the indexed lookup columns:
 *  - ShippingMethod: `{ tenantId, code }` (tenant-scoped human code)
 *  - ShippingRate:   `{ tenantId, shippingMethodId, name }`
 *
 * Rules of the house (same as the store reference seed):
 *  - Always go through `ctx.foc(repo, where, create)` so re-runs reuse rows.
 *  - Use *valid* enum values — carriers come from ShippingCarrierEnum:
 *    ARAS / YURTICI / MNG / PTT / UPS / FEDEX / DHL / TNT / CUSTOM.
 *  - Numbers are numbers (decimals are mapped back to `number` by the entity
 *    transformers); never pass stringified amounts.
 *  - Publish anything other modules depend on into `ctx.refs`.
 */
export async function seedPaymentShipping(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  const methodRepo = ctx.repo<ShippingMethod>(ShippingMethod);
  const rateRepo = ctx.repo<ShippingRate>(ShippingRate);

  // ── Shipping methods (standard / express / pickup) ──────────────────────────
  // Varied carriers, an inactive flag, and jsonb metadata to exercise the model.
  type MethodDef = {
    code: string;
    name: string;
    carrier?: string;
    description?: string;
    isActive: boolean;
    sortOrder: number;
    metadata?: Record<string, unknown>;
  };
  const methodDefs: MethodDef[] = [
    {
      code: 'standard',
      name: 'Standard Shipping',
      carrier: 'YURTICI',
      description: 'Economy ground delivery, 3-6 business days.',
      isActive: true,
      sortOrder: 1,
      metadata: { trackingUrl: 'https://yurticikargo.com/track', tier: 'economy' },
    },
    {
      code: 'express',
      name: 'Express Shipping',
      carrier: 'UPS',
      description: 'Priority air delivery, 1-2 business days.',
      isActive: true,
      sortOrder: 2,
      metadata: { trackingUrl: 'https://www.ups.com/track', tier: 'priority', signatureRequired: true },
    },
    {
      code: 'pickup',
      name: 'In-Store Pickup',
      carrier: 'CUSTOM',
      description: 'Collect your order from the store. No shipping fee.',
      isActive: true,
      sortOrder: 3,
      metadata: { location: 'Main Branch', tier: 'pickup' },
    },
    {
      code: 'legacy-courier',
      name: 'Legacy Courier (retired)',
      carrier: 'MNG',
      description: 'Deprecated carrier kept for historical orders.',
      isActive: false,
      sortOrder: 9,
    },
  ];

  const methods: Record<string, ShippingMethod> = {};
  for (const def of methodDefs) {
    methods[def.code] = await foc(methodRepo,
      { tenantId, code: def.code } as FindOptionsWhere<ShippingMethod>,
      { tenantId, ...def },
    );
  }

  // ── Shipping rates (per-method, varied geo / weight / subtotal tiers) ───────
  type RateDef = {
    methodCode: string;
    name: string;
    countryCode?: string;
    region?: string;
    minWeight?: number;
    maxWeight?: number;
    minSubtotal?: number;
    maxSubtotal?: number;
    price: number;
    currency: string;
    freeThreshold?: number;
    estimatedDaysMin?: number;
    estimatedDaysMax?: number;
    isActive: boolean;
    sortOrder: number;
  };
  const rateDefs: RateDef[] = [
    // Standard — domestic flat rate with a free-shipping threshold.
    {
      methodCode: 'standard', name: 'TR Domestic Flat', countryCode: 'TR',
      price: 4.99, currency: 'USD', freeThreshold: 75,
      estimatedDaysMin: 3, estimatedDaysMax: 6, isActive: true, sortOrder: 1,
    },
    // Standard — heavier parcels cost more (weight-banded).
    {
      methodCode: 'standard', name: 'TR Heavy Parcel', countryCode: 'TR',
      minWeight: 5, maxWeight: 30, price: 12.5, currency: 'USD',
      estimatedDaysMin: 4, estimatedDaysMax: 8, isActive: true, sortOrder: 2,
    },
    // Standard — international, no free threshold.
    {
      methodCode: 'standard', name: 'International Standard',
      price: 24.0, currency: 'USD',
      estimatedDaysMin: 7, estimatedDaysMax: 21, isActive: true, sortOrder: 3,
    },
    // Express — domestic, subtotal-gated premium tier.
    {
      methodCode: 'express', name: 'TR Express Next-Day', countryCode: 'TR', region: 'Istanbul',
      minSubtotal: 0, maxSubtotal: 1000, price: 14.99, currency: 'USD',
      estimatedDaysMin: 1, estimatedDaysMax: 2, isActive: true, sortOrder: 1,
    },
    // Express — international priority.
    {
      methodCode: 'express', name: 'International Express',
      price: 49.99, currency: 'USD', freeThreshold: 500,
      estimatedDaysMin: 2, estimatedDaysMax: 4, isActive: true, sortOrder: 2,
    },
    // Pickup — always free, same-day.
    {
      methodCode: 'pickup', name: 'Store Pickup (free)', countryCode: 'TR',
      price: 0, currency: 'USD', freeThreshold: 0,
      estimatedDaysMin: 0, estimatedDaysMax: 1, isActive: true, sortOrder: 1,
    },
  ];

  let firstMethodId: string | undefined;
  let firstRateId: string | undefined;
  for (const def of rateDefs) {
    const method = methods[def.methodCode];
    const { methodCode, ...rate } = def;
    void methodCode;
    const saved = await foc(rateRepo,
      { tenantId, shippingMethodId: method.shippingMethodId, name: def.name } as FindOptionsWhere<ShippingRate>,
      { tenantId, shippingMethodId: method.shippingMethodId, ...rate },
    );
    firstMethodId ??= method.shippingMethodId;
    firstRateId ??= saved.shippingRateId;
  }

  // ── Publish references other modules consume ───────────────────────────────
  refs.shippingMethodId = firstMethodId ?? methods['standard'].shippingMethodId;
  refs.shippingRateId = firstRateId;

  ctx.log(`payment_shipping: ${methodDefs.length} shipping methods, ${rateDefs.length} rates for ${tenantId}`);
}
