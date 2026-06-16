import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@nb/seed/server/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@nb/seed/server/seed.context';
import { Wishlist } from './entities/wishlist.entity';
import { WishlistItem } from './entities/wishlist_item.entity';

/**
 * Demo-data seed for the `payment_wishlist` module.
 *
 * Follows the `store.seed.ts` template:
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` so re-runs reuse rows instead of duplicating them.
 *  - Both entities carry a `tenantId` column, so they are tenant-scoped:
 *    we use `ctx.repo<Entity>(Entity)` and set `tenantId: ctx.tenantId`.
 *  - `isPublic` wishlists carry a stable `shareToken` (a deterministic uuid)
 *    so the share-link feature is exercised idempotently.
 *  - Cross-module ids (user / product / variant) come from `ctx.refs` when an
 *    earlier seed published them, else fall back to fixed uuid literals.
 */
export async function seedPaymentWishlist(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // ── Cross-module references (bare uuids; no cross-DB FKs) ──────────────────
  const userId = (refs.userId as string) ?? SEED_USER_ID;
  const adminUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;
  const productId = (refs.productId as string) ?? 'a1000000-0000-4000-8000-000000000001';
  const planProductId = (refs.planProductId as string) ?? 'a1000000-0000-4000-8000-000000000002';
  const productVariantId = (refs.productVariantId as string) ?? 'a1000000-0000-4000-8000-000000000003';
  const bundleProductId = (refs.bundleId as string) ?? 'a1000000-0000-4000-8000-000000000004';

  const wishlistRepo = ctx.repo<Wishlist>(Wishlist);
  const itemRepo = ctx.repo<WishlistItem>(WishlistItem);

  // ── Wishlists ──────────────────────────────────────────────────────────────
  // Natural key: (tenantId, userId, name). Cover the default private list, a
  // public shared list (with shareToken), and a second user's gift list.
  type WishlistDef = {
    userId: string;
    name: string;
    isPublic: boolean;
    shareToken?: string;
    metadata?: Record<string, unknown>;
  };
  const wishlistDefs: WishlistDef[] = [
    // The auto-created default list every user gets — private, no share token.
    { userId, name: 'Default', isPublic: false },
    // A curated, publicly shareable list — exercises shareToken + metadata.
    {
      userId,
      name: 'Holiday Picks',
      isPublic: true,
      shareToken: 'c1000000-0000-4000-8000-000000000001',
      metadata: { color: '#e11d48', icon: 'gift', occasion: 'holiday', locale: 'en-US' },
    },
    // A second user's private gift list — exercises a different owner.
    {
      userId: adminUserId,
      name: 'Office Gear',
      isPublic: false,
      metadata: { color: '#2563eb', icon: 'briefcase', locale: 'tr-TR' },
    },
  ];

  const wishlists: Record<string, Wishlist> = {};
  for (const def of wishlistDefs) {
    const wishlist = await foc(wishlistRepo,
      { tenantId, userId: def.userId, name: def.name } as FindOptionsWhere<Wishlist>,
      { tenantId, ...def },
    );
    wishlists[def.name] = wishlist;
  }

  const defaultList = wishlists['Default'];
  const holidayList = wishlists['Holiday Picks'];
  const officeList = wishlists['Office Gear'];

  // ── Wishlist items ───────────────────────────────────────────────────────────
  // Natural key: (tenantId, wishlistId, productId). Vary product/variant/note
  // across lists, including a variant-specific entry and notes vs. no notes.
  type ItemDef = {
    wishlistId: string;
    productId: string;
    variantId?: string;
    note?: string;
  };
  const itemDefs: ItemDef[] = [
    // Default list: a plain product and a variant-specific product with a note.
    { wishlistId: defaultList.wishlistId, productId },
    { wishlistId: defaultList.wishlistId, productId, variantId: productVariantId, note: 'Prefer the 16GB / 512GB config' },
    // Holiday list: a couple of gift candidates, one annotated.
    { wishlistId: holidayList.wishlistId, productId, note: 'Maybe in red?' },
    { wishlistId: holidayList.wishlistId, productId: bundleProductId, note: 'Great starter gift bundle' },
    // Office list: a subscription plan, no variant, no note.
    { wishlistId: officeList.wishlistId, productId: planProductId },
  ];
  for (const def of itemDefs) {
    await foc(itemRepo,
      { tenantId, wishlistId: def.wishlistId, productId: def.productId } as FindOptionsWhere<WishlistItem>,
      { tenantId, ...def },
    );
  }

  // ── Publish references later modules might consume ─────────────────────────
  refs.wishlistId = defaultList.wishlistId;
  refs.publicWishlistShareToken = holidayList.shareToken;

  ctx.log(`payment_wishlist: 3 wishlists (1 public), 5 items for ${tenantId}`);
}
