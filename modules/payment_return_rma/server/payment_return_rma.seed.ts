import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { SEED_USER_ID, SEED_ORDER_ID } from '@kuraykaraaslan/seed/server/seed.context';
import { ReturnRequest } from './entities/return_request.entity';
import { ReturnItem } from './entities/return_item.entity';
import { ReturnEvent } from './entities/return_event.entity';

/**
 * Demo seed for the `payment_return_rma` module.
 *
 * Models the RMA lifecycle: a customer opens a return/exchange/refund request
 * (ReturnRequest), lists the line items being sent back (ReturnItem) and the
 * append-only status history is captured as ReturnEvent rows.
 *
 * House rules (mirrors `store.seed.ts`):
 *  - Go through `ctx.foc(repo, where, create)` with a natural key in `where`
 *    so re-runs reuse rows. There are no `@Unique` constraints here, so we use
 *    the indexed `rmaNumber` (per request) and `(returnRequestId, status)` /
 *    `(returnRequestId, name)` composites for the children.
 *  - Use ONLY valid enum values: type ∈ RETURN/EXCHANGE/REFUND,
 *    status ∈ REQUESTED/APPROVED/REJECTED/RECEIVED/REFUNDED/COMPLETED/CANCELLED,
 *    condition ∈ UNOPENED/USED/DAMAGED/DEFECTIVE/OTHER.
 *  - Numbers are numbers (decimals map back to `number` via transformers).
 *  - All three entities carry a `tenantId` column → tenant-scoped (`ctx.repo`).
 */
export async function seedPaymentReturnRma(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // Cross-module ids are bare uuids (no cross-DB FKs). Prefer published refs,
  // fall back to the shared deterministic seed constants / fixed literals.
  const orderId = (refs.orderId as string) ?? SEED_ORDER_ID;
  const paymentId = (refs.paymentId as string) ?? 'c1000000-0000-4000-8000-000000000001';
  const userId = (refs.userId as string) ?? SEED_USER_ID;
  const productId = (refs.productId as string) ?? 'a1000000-0000-4000-8000-000000000001';
  const variantId = (refs.productVariantId as string) ?? 'a1000000-0000-4000-8000-000000000002';

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const requestRepo = ctx.repo<ReturnRequest>(ReturnRequest);
  const itemRepo = ctx.repo<ReturnItem>(ReturnItem);
  const eventRepo = ctx.repo<ReturnEvent>(ReturnEvent);

  // ── Return requests (refunded RETURN / approved EXCHANGE / rejected REFUND) ──
  // 1) A completed RETURN that was approved, received and refunded.
  const refundedReturn = await foc(requestRepo,
    { tenantId, rmaNumber: 'RMA-SEED0001' } as FindOptionsWhere<ReturnRequest>,
    {
      tenantId, orderId, paymentId, userId,
      rmaNumber: 'RMA-SEED0001', type: 'RETURN', status: 'REFUNDED',
      reason: 'Item not as described',
      customerNote: 'The laptop screen had a dead pixel out of the box.',
      adminNote: 'Inspected — confirmed defect. Full refund issued.',
      refundAmount: 1299.99, currency: 'USD',
      metadata: { channel: 'web', refundMethod: 'original_payment', restockable: false },
      approvedAt: daysAgo(9), receivedAt: daysAgo(6), refundedAt: daysAgo(4),
      createdAt: daysAgo(11),
    },
  );

  // 2) An approved EXCHANGE still awaiting the returned goods.
  const exchange = await foc(requestRepo,
    { tenantId, rmaNumber: 'RMA-SEED0002' } as FindOptionsWhere<ReturnRequest>,
    {
      tenantId, orderId, userId,
      rmaNumber: 'RMA-SEED0002', type: 'EXCHANGE', status: 'APPROVED',
      reason: 'Wrong size',
      customerNote: 'Would like to swap for the 16 GB / 512 GB configuration.',
      adminNote: 'Approved — awaiting return shipment before dispatching replacement.',
      currency: 'EUR',
      metadata: { channel: 'mobile', exchangeFor: 'TEST-LAPTOP-16-512', prepaidLabel: true },
      approvedAt: daysAgo(2),
      createdAt: daysAgo(3),
    },
  );

  // 3) A rejected REFUND request (outside the return window).
  const rejectedRefund = await foc(requestRepo,
    { tenantId, rmaNumber: 'RMA-SEED0003' } as FindOptionsWhere<ReturnRequest>,
    {
      tenantId, orderId, paymentId, userId,
      rmaNumber: 'RMA-SEED0003', type: 'REFUND', status: 'REJECTED',
      reason: 'Changed my mind',
      customerNote: 'I no longer need this accessory.',
      adminNote: 'Rejected — request opened 45 days after delivery (30-day policy).',
      refundAmount: 0, currency: 'USD',
      metadata: { channel: 'web', policyWindowDays: 30, daysSinceDelivery: 45 },
      createdAt: daysAgo(1),
    },
  );

  // ── Return line items (varied conditions across the requests) ───────────────
  type ItemDef = {
    request: ReturnRequest;
    name: string;
    quantity: number;
    sku?: string;
    productId?: string;
    variantId?: string;
    orderItemId?: string;
    reason?: string;
    condition?: string;
  };
  const itemDefs: ItemDef[] = [
    {
      request: refundedReturn, name: 'Test Laptop', quantity: 1,
      sku: 'TEST-LAPTOP', productId, variantId,
      reason: 'Dead pixel on arrival', condition: 'DEFECTIVE',
    },
    {
      request: exchange, name: 'Test Laptop', quantity: 1,
      sku: 'TEST-LAPTOP-8-256', productId, variantId,
      reason: 'Wrong configuration ordered', condition: 'UNOPENED',
    },
    {
      request: rejectedRefund, name: 'Wireless Mouse', quantity: 2,
      sku: 'TEST-MOUSE', productId,
      reason: 'No longer needed', condition: 'USED',
    },
  ];
  for (const def of itemDefs) {
    await foc(itemRepo,
      { tenantId, returnRequestId: def.request.returnRequestId, name: def.name } as FindOptionsWhere<ReturnItem>,
      {
        tenantId, returnRequestId: def.request.returnRequestId,
        name: def.name, quantity: def.quantity, sku: def.sku,
        productId: def.productId, variantId: def.variantId, orderItemId: def.orderItemId,
        reason: def.reason, condition: def.condition,
      },
    );
  }

  // ── Status history (append-only audit trail) ────────────────────────────────
  type EventDef = { request: ReturnRequest; status: string; message?: string; metadata?: unknown; createdAt: Date };
  const eventDefs: EventDef[] = [
    // RMA-SEED0001: REQUESTED → APPROVED → RECEIVED → REFUNDED
    { request: refundedReturn, status: 'REQUESTED', message: 'Customer opened a return request.', createdAt: daysAgo(11) },
    { request: refundedReturn, status: 'APPROVED', message: 'Return approved by support.', metadata: { by: 'agent', agentId: SEED_USER_ID }, createdAt: daysAgo(9) },
    { request: refundedReturn, status: 'RECEIVED', message: 'Returned item received at warehouse.', metadata: { location: 'WH-1' }, createdAt: daysAgo(6) },
    { request: refundedReturn, status: 'REFUNDED', message: 'Refund of 1299.99 USD issued to original payment.', metadata: { amount: 1299.99, currency: 'USD' }, createdAt: daysAgo(4) },
    // RMA-SEED0002: REQUESTED → APPROVED
    { request: exchange, status: 'REQUESTED', message: 'Exchange requested for a different configuration.', createdAt: daysAgo(3) },
    { request: exchange, status: 'APPROVED', message: 'Exchange approved; prepaid return label sent.', metadata: { prepaidLabel: true }, createdAt: daysAgo(2) },
    // RMA-SEED0003: REQUESTED → REJECTED
    { request: rejectedRefund, status: 'REQUESTED', message: 'Refund requested.', createdAt: daysAgo(1) },
    { request: rejectedRefund, status: 'REJECTED', message: 'Rejected — outside the 30-day return window.', metadata: { reasonCode: 'OUT_OF_WINDOW' }, createdAt: daysAgo(1) },
  ];
  for (const def of eventDefs) {
    await foc(eventRepo,
      { tenantId, returnRequestId: def.request.returnRequestId, status: def.status } as FindOptionsWhere<ReturnEvent>,
      {
        tenantId, returnRequestId: def.request.returnRequestId,
        status: def.status, message: def.message, metadata: def.metadata, createdAt: def.createdAt,
      },
    );
  }

  // ── Publish references later modules might consume ──────────────────────────
  refs.returnRequestId = refundedReturn.returnRequestId;
  refs.rmaNumber = refundedReturn.rmaNumber;

  ctx.log(`payment_return_rma: 3 RMA requests, 3 return items, ${eventDefs.length} status events for ${tenantId}`);
}
