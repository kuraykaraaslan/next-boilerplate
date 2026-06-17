import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { SEED_USER_ID, SEED_ORDER_ID } from '@kuraykaraaslan/seed/server/seed.context';
import { Invoice } from './entities/invoice.entity';
import { InvoiceLine } from './entities/invoice_line.entity';

/**
 * Invoice module seed.
 *
 * Both entities are tenant-scoped (they carry a `tenantId` column), so we use
 * `ctx.repo<Entity>(Entity)` and stamp `tenantId: ctx.tenantId` on every row.
 *
 * Rules of the house (mirrors `store.seed.ts`):
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` so re-runs reuse rows instead of duplicating them. The invoice's
 *    natural key is its `@Unique(['tenantId', 'invoiceNumber'])` constraint;
 *    lines have no unique constraint so we key them by
 *    `(tenantId, invoiceId, description)`.
 *  - Use *valid* enum values only (see `invoice.enums.ts`):
 *      status    : draft | issued | paid | void | refunded
 *      region    : TR | EU | US | OTHER
 *      taxScheme : KDV | VAT | SALES_TAX | NONE
 *      line src  : subscription | product | one_off | usage | credit | proration | discount
 *  - Numbers are numbers (decimals are mapped back to `number` by the entity
 *    transformers); never pass stringified amounts.
 *  - Timestamps are real `Date` objects.
 *  - Cross-module ids (payment / subscription / order) are bare uuids — read
 *    from `ctx.refs` when present, else fall back to a deterministic literal.
 */
export async function seedInvoice(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  // Cross-module references (bare uuids; no cross-DB FKs).
  const paymentId = (refs.paymentId as string) ?? 'c1000000-0000-4000-8000-000000000001';
  const subscriptionId = (refs.subscriptionPlanId as string) ?? 'd1000000-0000-4000-8000-000000000001';
  const productId = (refs.productId as string) ?? 'a1000000-0000-4000-8000-000000000001';
  const orderId = SEED_ORDER_ID;
  const userId = SEED_USER_ID;

  const invoiceRepo = ctx.repo<Invoice>(Invoice);
  const lineRepo = ctx.repo<InvoiceLine>(InvoiceLine);

  // ── Local concrete row types (keeps tsc inference happy through foc) ─────────
  type InvoiceDef = {
    invoiceNumber: string;
    paymentId?: string;
    subscriptionId?: string;
    customerEmail: string;
    customerName: string;
    customerTaxId?: string;
    customerAddress?: object;
    customerCountryCode: string;
    issueDate: Date;
    dueDate?: Date;
    paidAt?: Date;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
    status: string;
    region: string;
    taxScheme: string;
    earsivUuid?: string;
    earsivStatus?: string;
    earsivIntegrator?: string;
    peppolDocumentId?: string;
    peppolStatus?: string;
    stripeTaxCalculationId?: string;
    pdfStorageKey?: string;
    notes?: string;
    metadata?: object;
  };
  type LineDef = {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxAmount: number;
    lineTotal: number;
    sourceType?: string;
    sourceId?: string;
    metadata?: object;
  };

  // ── Invoice 1 — TR e-Arşiv, fully PAID, KDV 20% ────────────────────────────
  const inv1Def: InvoiceDef = {
    invoiceNumber: 'INV-2026-00001',
    paymentId,
    customerEmail: 'mehmet.yilmaz@example.com.tr',
    customerName: 'Mehmet Yılmaz',
    customerTaxId: '1234567890',
    customerAddress: { line1: 'Atatürk Cad. No:42', city: 'İstanbul', district: 'Kadıköy', postalCode: '34710', country: 'TR' },
    customerCountryCode: 'TR',
    issueDate: daysAgo(10),
    dueDate: daysAgo(-4),
    paidAt: daysAgo(8),
    subtotal: 1000,
    discountAmount: 0,
    taxAmount: 200,
    totalAmount: 1200,
    currency: 'TRY',
    status: 'paid',
    region: 'TR',
    taxScheme: 'KDV',
    earsivUuid: 'F1A2B3C4-0000-4000-8000-000000000001',
    earsivStatus: 'APPROVED',
    earsivIntegrator: 'NES',
    pdfStorageKey: 'invoices/tenant/INV-2026-00001.pdf',
    notes: 'e-Arşiv faturası — KDV dahildir.',
    metadata: { source: 'seed', locale: 'tr-TR', orderId },
  };
  const inv1 = await foc(invoiceRepo,
    { tenantId, invoiceNumber: inv1Def.invoiceNumber } as FindOptionsWhere<Invoice>,
    { tenantId, ...inv1Def },
  );

  // ── Invoice 2 — EU Peppol, ISSUED (awaiting payment), VAT 21% + discount ────
  const inv2Def: InvoiceDef = {
    invoiceNumber: 'INV-2026-00002',
    subscriptionId,
    customerEmail: 'anna.muller@example.de',
    customerName: 'Anna Müller GmbH',
    customerTaxId: 'DE123456789',
    customerAddress: { line1: 'Friedrichstraße 123', city: 'Berlin', postalCode: '10117', country: 'DE' },
    customerCountryCode: 'DE',
    issueDate: daysAgo(5),
    dueDate: daysAgo(-25),
    subtotal: 290,
    discountAmount: 29,
    taxAmount: 54.81,
    totalAmount: 315.81,
    currency: 'EUR',
    status: 'issued',
    region: 'EU',
    taxScheme: 'VAT',
    peppolDocumentId: 'urn:peppol:doc:0192:INV-2026-00002',
    peppolStatus: 'DELIVERED',
    notes: 'Reverse-charge does not apply; VAT charged at standard German rate.',
    metadata: { source: 'seed', locale: 'de-DE', billingCycle: 'monthly' },
  };
  const inv2 = await foc(invoiceRepo,
    { tenantId, invoiceNumber: inv2Def.invoiceNumber } as FindOptionsWhere<Invoice>,
    { tenantId, ...inv2Def },
  );

  // ── Invoice 3 — US Stripe Tax, DRAFT, sales tax ────────────────────────────
  const inv3Def: InvoiceDef = {
    invoiceNumber: 'INV-2026-00003',
    customerEmail: 'john.doe@example.com',
    customerName: 'John Doe',
    customerAddress: { line1: '1600 Amphitheatre Pkwy', city: 'Mountain View', state: 'CA', postalCode: '94043', country: 'US' },
    customerCountryCode: 'US',
    issueDate: daysAgo(1),
    dueDate: daysAgo(-14),
    subtotal: 49.99,
    discountAmount: 0,
    taxAmount: 4.62,
    totalAmount: 54.61,
    currency: 'USD',
    status: 'draft',
    region: 'US',
    taxScheme: 'SALES_TAX',
    stripeTaxCalculationId: 'taxcalc_seed_0000000000003',
    notes: 'Draft — not yet issued to the customer.',
    metadata: { source: 'seed', locale: 'en-US' },
  };
  const inv3 = await foc(invoiceRepo,
    { tenantId, invoiceNumber: inv3Def.invoiceNumber } as FindOptionsWhere<Invoice>,
    { tenantId, ...inv3Def },
  );

  // ── Lines per invoice (varied source types & tax rates) ─────────────────────
  const linesByInvoice: Array<{ invoiceId: string; lines: LineDef[] }> = [
    {
      invoiceId: inv1.invoiceId,
      lines: [
        { description: 'Pro Plan — Yıllık Abonelik', quantity: 1, unitPrice: 800, taxRate: 0.20, taxAmount: 160, lineTotal: 960, sourceType: 'subscription', sourceId: subscriptionId, metadata: { plan: 'pro' } },
        { description: 'Kurulum Hizmeti', quantity: 2, unitPrice: 100, taxRate: 0.20, taxAmount: 40, lineTotal: 240, sourceType: 'one_off' },
      ],
    },
    {
      invoiceId: inv2.invoiceId,
      lines: [
        { description: 'Team Plan subscription (monthly)', quantity: 1, unitPrice: 250, taxRate: 0.21, taxAmount: 46.41, lineTotal: 267.41, sourceType: 'subscription', sourceId: subscriptionId },
        { description: 'API overage — 40,000 extra requests', quantity: 40, unitPrice: 1, taxRate: 0.21, taxAmount: 8.40, lineTotal: 48.40, sourceType: 'usage' },
        { description: 'Loyalty discount', quantity: 1, unitPrice: -29, taxRate: 0, taxAmount: 0, lineTotal: -29, sourceType: 'discount' },
      ],
    },
    {
      invoiceId: inv3.invoiceId,
      lines: [
        { description: 'Test Laptop', quantity: 1, unitPrice: 39.99, taxRate: 0.0925, taxAmount: 3.70, lineTotal: 43.69, sourceType: 'product', sourceId: productId, metadata: { orderId } },
        { description: 'Account credit applied', quantity: 1, unitPrice: 10, taxRate: 0.0925, taxAmount: 0.92, lineTotal: 10.92, sourceType: 'credit', sourceId: userId },
      ],
    },
  ];

  let lineCount = 0;
  for (const group of linesByInvoice) {
    for (const line of group.lines) {
      await foc(lineRepo,
        { tenantId, invoiceId: group.invoiceId, description: line.description } as FindOptionsWhere<InvoiceLine>,
        { tenantId, invoiceId: group.invoiceId, ...line },
      );
      lineCount++;
    }
  }

  // ── Publish references later modules might consume ─────────────────────────
  refs.invoiceId = inv1.invoiceId;
  refs.invoiceNumber = inv1.invoiceNumber;

  ctx.log(`invoice: 3 invoices (TR paid / EU issued / US draft), ${lineCount} lines for ${tenantId}`);
}
