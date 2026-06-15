import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import { Wishlist as WishlistEntity } from './entities/wishlist.entity'
import { WishlistItem as WishlistItemEntity } from './entities/wishlist_item.entity'
import { SafeWishlistSchema } from './payment_wishlist.types'

/** Export every wishlist + items for a user (GDPR data portability). */
export async function exportForUser(tenantId: string, userId: string): Promise<unknown> {
  const ds = await tenantDataSourceFor(tenantId)
  const wishlists = await ds.getRepository(WishlistEntity).find({ where: { tenantId, userId } })
  const out = []
  for (const w of wishlists) {
    const items = await ds.getRepository(WishlistItemEntity).find({ where: { tenantId, wishlistId: w.wishlistId } })
    out.push({ ...SafeWishlistSchema.parse(w), items })
  }
  return { wishlists: out }
}

/** Right-to-erasure: delete all of a user's wishlists, items, and price history. */
export async function eraseForUser(tenantId: string, userId: string): Promise<{ wishlists: number; items: number }> {
  const ds = await tenantDataSourceFor(tenantId)
  const wishlists = await ds.getRepository(WishlistEntity).find({ where: { tenantId, userId } })
  const ids = wishlists.map((w) => w.wishlistId)
  let items = 0
  if (ids.length > 0) {
    const { In } = await import('typeorm')
    const itemRows = await ds.getRepository(WishlistItemEntity).find({ where: { tenantId, wishlistId: In(ids) } })
    const itemIds = itemRows.map((i) => i.wishlistItemId)
    items = itemRows.length
    if (itemIds.length > 0) {
      const { WishlistPricePoint } = await import('./entities/wishlist_price_point.entity')
      await ds.getRepository(WishlistPricePoint).delete({ tenantId, wishlistItemId: In(itemIds) })
    }
    await ds.getRepository(WishlistItemEntity).delete({ tenantId, wishlistId: In(ids) })
    await ds.getRepository(WishlistEntity).delete({ tenantId, userId })
  }
  return { wishlists: wishlists.length, items }
}
