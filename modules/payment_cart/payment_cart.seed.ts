import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { SEED_USER_ID } from '@/modules/seed/seed.context';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart_item.entity';

/**
 * payment_cart demo seed.
 *
 * Mirrors the reference `store.seed.ts`:
 *  - Every write goes through `ctx.foc(repo, where, create)` with a natural key
 *    in `where` so re-runs reuse rows instead of duplicating them. Neither cart
 *    entity declares a `@Unique([...])` constraint, so we use the logical
 *    identity instead: a cart is unique per `(tenantId, userId)` for the
 *    registered-user cart and per `(tenantId, guestToken)` for a guest cart; a
 *    line item is unique per `(tenantId, cartId, sku)`.
 *  - Both `Cart` and `CartItem` carry a `tenantId` column, so both are
 *    tenant-scoped → `ctx.repo(Entity)` + `tenantId: ctx.tenantId`.
 *  - Status values come straight from `CartStatusEnum`
 *    (ACTIVE / CONVERTED / ABANDONED / MERGED) — never an invented value.
 *  - Decimal columns (subtotal/discountTotal/unitPrice) are mapped back to
 *    `number` by TypeORM transformers, so we pass real numbers.
 */
export async function seedPaymentCart(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  // Cross-module ids (bare uuids — DBs have no cross-table FKs). Prefer refs
  // published by earlier seeds (store), else fall back to fixed uuid literals.
  const userId = (refs.userId as string) ?? SEED_USER_ID;
  const productId = (refs.productId as string) ?? 'a1000000-0000-4000-8000-000000000001';
  const variantId = (refs.productVariantId as string) ?? 'a1000000-0000-4000-8000-000000000002';
  const planProductId = (refs.planProductId as string) ?? 'a1000000-0000-4000-8000-000000000003';

  const cartRepo = ctx.repo<Cart>(Cart);
  const itemRepo = ctx.repo<CartItem>(CartItem);

  // ── Cart 1: active registered-user cart with a coupon ──────────────────────
  const activeCart = await foc(cartRepo,
    { tenantId, userId } as FindOptionsWhere<Cart>,
    {
      tenantId, userId,
      status: 'ACTIVE', currency: 'USD',
      couponCode: 'WELCOME10',
      subtotal: 1339.98, discountTotal: 134.0,
      metadata: { source: 'web', note: 'seeded active cart' },
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
  );

  // ── Cart 2: abandoned guest cart (different currency / locale) ──────────────
  const guestCart = await foc(cartRepo,
    { tenantId, guestToken: 'seed-guest-token-eu' } as FindOptionsWhere<Cart>,
    {
      tenantId, guestToken: 'seed-guest-token-eu',
      status: 'ABANDONED', currency: 'EUR',
      couponCode: null,
      subtotal: 27.0, discountTotal: 0,
      metadata: { source: 'mobile', locale: 'de-DE', abandonedAt: daysAgo(3).toISOString() },
      expiresAt: daysAgo(1),
    },
  );

  // ── Cart 3: converted cart that became an order ─────────────────────────────
  const convertedCart = await foc(cartRepo,
    { tenantId, guestToken: 'seed-converted-cart' } as FindOptionsWhere<Cart>,
    {
      tenantId, userId,
      guestToken: 'seed-converted-cart',
      status: 'CONVERTED', currency: 'USD',
      couponCode: 'SUMMER',
      subtotal: 29.0, discountTotal: 5.0,
      metadata: { source: 'web', convertedToOrderId: (refs.orderId as string) ?? null },
    },
  );

  // ── Cart items ──────────────────────────────────────────────────────────────
  type ItemDef = {
    cartId: string;
    productId?: string;
    variantId?: string;
    sku: string;
    name: string;
    unitPrice: number;
    quantity: number;
    metadata?: unknown;
  };

  const itemDefs: ItemDef[] = [
    // Active cart: a configured laptop variant + an accessory.
    {
      cartId: activeCart.cartId, productId, variantId,
      sku: 'TEST-LAPTOP-16-512', name: 'Test Laptop (16 GB / 512 GB)',
      unitPrice: 1299.99, quantity: 1,
      metadata: { ram: '16', storage: '512', color: 'Red' },
    },
    {
      cartId: activeCart.cartId, productId,
      sku: 'TEST-MOUSE', name: 'Wireless Mouse',
      unitPrice: 39.99, quantity: 1,
      metadata: { color: 'Black' },
    },
    // Guest cart: a single accessory, larger quantity.
    {
      cartId: guestCart.cartId, productId,
      sku: 'TEST-MOUSE', name: 'Wireless Mouse',
      unitPrice: 9.0, quantity: 3,
      metadata: { color: 'White', giftWrap: true },
    },
    // Converted cart: a digital plan line (no variant).
    {
      cartId: convertedCart.cartId, productId: planProductId,
      sku: 'TEST-PRO-PLAN', name: 'Pro Plan',
      unitPrice: 29.0, quantity: 1,
      metadata: { billingCycle: 'monthly', digital: true },
    },
  ];

  for (const def of itemDefs) {
    await foc(itemRepo,
      { tenantId, cartId: def.cartId, sku: def.sku } as FindOptionsWhere<CartItem>,
      { tenantId, ...def },
    );
  }

  // ── Publish references later modules consume ────────────────────────────────
  refs.cartId = activeCart.cartId;
  refs.couponCode = 'WELCOME10';

  ctx.log(`payment_cart: 3 carts (active/abandoned/converted), 4 items for ${tenantId}`);
}
