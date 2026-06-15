import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import { WishlistItem as WishlistItemEntity } from './entities/wishlist_item.entity'

/**
 * Add every in-stock wishlist item to the owner's active cart in one action.
 * Resolves each product's live price/name from the store catalogue and marks
 * the wishlist item as converted (addedToCartAt) for conversion analytics.
 */
export async function addAllToCart(
  tenantId: string, wishlistId: string, opts: { userId?: string; guestToken?: string; currency?: string },
): Promise<{ added: number; skipped: number }> {
  const ds = await tenantDataSourceFor(tenantId)
  const items = await ds.getRepository(WishlistItemEntity).find({ where: { tenantId, wishlistId } })
  if (items.length === 0) return { added: 0, skipped: 0 }

  const { StoreProduct: ProductEntity } = await import('@/modules/store/entities/store_product.entity')
  const { StoreProductSchema } = await import('@/modules/store/store.types')
  const { default: StorePricingService } = await import('@/modules/store/store.pricing.service')
  const { default: PaymentCartService } = await import('@/modules/payment_cart/payment_cart.service')

  const cart = await PaymentCartService.getOrCreateCart(tenantId, { userId: opts.userId, guestToken: opts.guestToken, currency: opts.currency ?? 'USD' })
  const productRepo = ds.getRepository(ProductEntity)
  const itemRepo = ds.getRepository(WishlistItemEntity)

  let added = 0, skipped = 0
  for (const item of items) {
    const row = await productRepo.findOne({ where: { tenantId, productId: item.productId } })
    if (!row) { skipped++; continue }
    const product = StoreProductSchema.parse(row)
    const inStock = product.fulfillmentType === 'DIGITAL_UNLIMITED' || StorePricingService.totalStock(product) > 0 || product.allowBackorder
    if (product.status !== 'ACTIVE' || !inStock) { skipped++; continue }
    const price = StorePricingService.resolvePrice(product, { currency: opts.currency })
    try {
      await PaymentCartService.addItem(tenantId, cart.cartId, {
        productId: item.productId, variantId: item.variantId ?? undefined,
        name: product.name, unitPrice: price.amount, quantity: 1,
      })
      item.addedToCartAt = new Date()
      await itemRepo.save(item).catch(() => {})
      added++
    } catch { skipped++ }
  }
  return { added, skipped }
}

/** Mark a single wishlist item as added-to-cart (conversion signal). */
export async function markAddedToCart(tenantId: string, wishlistItemId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId)
  await ds.getRepository(WishlistItemEntity).update({ tenantId, wishlistItemId }, { addedToCartAt: new Date() })
}

/** Wishlist→cart conversion stats for a tenant (optionally one wishlist). */
export async function conversionStats(tenantId: string, wishlistId?: string): Promise<{ total: number; converted: number; rate: number }> {
  const ds = await tenantDataSourceFor(tenantId)
  const repo = ds.getRepository(WishlistItemEntity)
  const where: Record<string, unknown> = { tenantId }
  if (wishlistId) where.wishlistId = wishlistId
  const total = await repo.count({ where })
  const converted = await repo.createQueryBuilder('i')
    .where('i."tenantId" = :tenantId', { tenantId })
    .andWhere(wishlistId ? 'i."wishlistId" = :wishlistId' : '1=1', wishlistId ? { wishlistId } : {})
    .andWhere('i."addedToCartAt" IS NOT NULL')
    .getCount()
  return { total, converted, rate: total ? Math.round((converted / total) * 1000) / 10 : 0 }
}
