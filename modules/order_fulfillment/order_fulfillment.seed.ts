import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { SEED_ORDER_ID } from '@/modules/seed/seed.context';
import { Fulfillment } from './entities/fulfillment.entity';
import { FulfillmentItem } from './entities/fulfillment_item.entity';
import { FulfillmentEvent } from './entities/fulfillment_event.entity';

/**
 * order_fulfillment seed.
 *
 * Mirrors the store reference seed:
 *  - always find-or-create through `ctx.foc(repo, where, create)` with a natural
 *    key in `where` so re-runs reuse rows (these entities have no @Unique
 *    constraint, so we key on the logically-unique indexed columns —
 *    orderId / trackingNumber for fulfillments, fulfillmentId+sku for items,
 *    fulfillmentId+status for events).
 *  - use ONLY valid enum string values from `order_fulfillment.enums.ts`:
 *      status  : PENDING | PROCESSING | PACKED | SHIPPED | IN_TRANSIT |
 *                DELIVERED | CANCELLED | RETURNED
 *      carrier : ARAS | YURTICI | MNG | PTT | UPS | FEDEX | DHL | TNT | CUSTOM
 *  - numbers are numbers; timestamps are real Date objects.
 *  - all three entities carry a `tenantId` column → tenant-scoped repos.
 */
export async function seedOrderFulfillment(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // Cross-module ids are bare uuids (no cross-DB FKs). Prefer published refs,
  // fall back to deterministic literals / the shared SEED_ORDER_ID constant.
  const orderId = (refs.orderId as string) ?? SEED_ORDER_ID;
  const productId = (refs.productId as string) ?? 'a1000000-0000-4000-8000-000000000001';
  const variantId = (refs.productVariantId as string) ?? 'a1000000-0000-4000-8000-000000000002';
  const shippingMethodId = (refs.shippingMethodId as string) ?? 'c1000000-0000-4000-8000-000000000001';

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const fulfillmentRepo = ctx.repo<Fulfillment>(Fulfillment);
  const itemRepo = ctx.repo<FulfillmentItem>(FulfillmentItem);
  const eventRepo = ctx.repo<FulfillmentEvent>(FulfillmentEvent);

  // ── Fulfillment #1: a delivered shipment (full happy-path lifecycle) ────────
  const delivered = await foc(fulfillmentRepo,
    { tenantId, orderId } as FindOptionsWhere<Fulfillment>,
    {
      tenantId, orderId,
      status: 'DELIVERED',
      carrier: 'UPS',
      trackingNumber: '1Z999AA10123456784',
      trackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
      shippingMethodId,
      notes: 'Leave at front door if no answer.',
      metadata: { weightKg: 2.1, boxes: 1, signatureRequired: false },
      packedAt: daysAgo(6),
      shippedAt: daysAgo(5),
      deliveredAt: daysAgo(2),
    },
  );

  // ── Fulfillment #2: an in-transit shipment with a different carrier ─────────
  const inTransit = await foc(fulfillmentRepo,
    { tenantId, trackingNumber: 'YT-7788990011' } as FindOptionsWhere<Fulfillment>,
    {
      tenantId, orderId,
      status: 'IN_TRANSIT',
      carrier: 'YURTICI',
      trackingNumber: 'YT-7788990011',
      trackingUrl: 'https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=YT-7788990011',
      shippingMethodId,
      notes: 'Fragile — contains electronics.',
      metadata: { weightKg: 1.8, boxes: 1, signatureRequired: true },
      packedAt: daysAgo(2),
      shippedAt: daysAgo(1),
    },
  );

  // ── Fulfillment #3: a pending shipment awaiting packing (no tracking yet) ───
  const pending = await foc(fulfillmentRepo,
    { tenantId, trackingNumber: 'PENDING-SEED-0003' } as FindOptionsWhere<Fulfillment>,
    {
      tenantId, orderId,
      status: 'PENDING',
      // carrier/trackingUrl left unset — not yet handed to a courier.
      trackingNumber: 'PENDING-SEED-0003',
      notes: 'Awaiting warehouse pick & pack.',
      metadata: { priority: 'standard' },
    },
  );

  // ── Fulfillment items (the shipped/packed contents per fulfillment) ─────────
  type ItemDef = {
    fulfillmentId: string;
    orderItemId?: string;
    productId?: string;
    variantId?: string;
    sku?: string;
    name: string;
    quantity: number;
  };
  const itemDefs: ItemDef[] = [
    // delivered shipment: a laptop + its variant
    { fulfillmentId: delivered.fulfillmentId, orderItemId: 'd1000000-0000-4000-8000-000000000001', productId, variantId, sku: 'TEST-LAPTOP-16-512', name: 'Test Laptop (16 GB / 512 GB)', quantity: 1 },
    { fulfillmentId: delivered.fulfillmentId, orderItemId: 'd1000000-0000-4000-8000-000000000002', productId, sku: 'TEST-MOUSE', name: 'Wireless Mouse', quantity: 2 },
    // in-transit shipment: a single accessory
    { fulfillmentId: inTransit.fulfillmentId, orderItemId: 'd1000000-0000-4000-8000-000000000003', productId, sku: 'TEST-MOUSE', name: 'Wireless Mouse', quantity: 1 },
    // pending shipment: digital line with no variant/sku
    { fulfillmentId: pending.fulfillmentId, orderItemId: 'd1000000-0000-4000-8000-000000000004', productId, name: 'Pro Plan (monthly)', quantity: 1 },
  ];
  for (const def of itemDefs) {
    await foc(itemRepo,
      { tenantId, fulfillmentId: def.fulfillmentId, name: def.name } as FindOptionsWhere<FulfillmentItem>,
      { tenantId, ...def },
    );
  }

  // ── Fulfillment events (status-history timeline per fulfillment) ────────────
  type EventDef = {
    fulfillmentId: string;
    status: string;
    message?: string;
    metadata?: unknown;
    createdAt: Date;
  };
  const eventDefs: EventDef[] = [
    // delivered: full lifecycle history
    { fulfillmentId: delivered.fulfillmentId, status: 'PENDING', message: 'Fulfillment created', createdAt: daysAgo(7) },
    { fulfillmentId: delivered.fulfillmentId, status: 'PACKED', message: 'Items packed and labelled', createdAt: daysAgo(6) },
    { fulfillmentId: delivered.fulfillmentId, status: 'SHIPPED', message: 'Handed to UPS', metadata: { hub: 'IST-1' }, createdAt: daysAgo(5) },
    { fulfillmentId: delivered.fulfillmentId, status: 'DELIVERED', message: 'Delivered to recipient', metadata: { signedBy: 'A. Yilmaz' }, createdAt: daysAgo(2) },
    // in-transit: partial history
    { fulfillmentId: inTransit.fulfillmentId, status: 'PACKED', message: 'Items packed', createdAt: daysAgo(2) },
    { fulfillmentId: inTransit.fulfillmentId, status: 'IN_TRANSIT', message: 'In transit via Yurtici', metadata: { lastScan: 'Ankara Transfer' }, createdAt: daysAgo(1) },
    // pending: just created
    { fulfillmentId: pending.fulfillmentId, status: 'PENDING', message: 'Awaiting fulfillment', createdAt: now },
  ];
  for (const def of eventDefs) {
    await foc(eventRepo,
      { tenantId, fulfillmentId: def.fulfillmentId, status: def.status } as FindOptionsWhere<FulfillmentEvent>,
      { tenantId, ...def },
    );
  }

  // ── Publish references later modules might consume ──────────────────────────
  refs.fulfillmentId = delivered.fulfillmentId;
  refs.orderId = orderId;

  ctx.log(`order_fulfillment: 3 fulfillments, ${itemDefs.length} items, ${eventDefs.length} events for ${tenantId}`);
}
