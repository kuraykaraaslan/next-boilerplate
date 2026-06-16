import 'reflect-metadata'
import { In } from 'typeorm'
import { tenantDataSourceFor } from '@nb/db'
import Logger from '@nb/logger'
import WebhookService from '@nb/webhook/server/webhook.service'
import { Wishlist as WishlistEntity } from './entities/wishlist.entity'
import { WishlistItem as WishlistItemEntity } from './entities/wishlist_item.entity'
import { WishlistPricePoint as PricePointEntity } from './entities/wishlist_price_point.entity'
import { StoreProduct as ProductEntity } from '@nb/store/server/entities/store_product.entity'
import { StoreProductSchema } from '@nb/store/server/store.types'
import StorePricingService from '@nb/store/server/store.pricing.service'

export interface PriceWatchResult {
  scanned: number
  priceDrops: number
  backInStock: number
}

/**
 * Wishlist price-watch sweep — the engine behind price-drop and back-in-stock
 * notifications (the highest-impact wishlist re-engagement driver). For each
 * wishlist item it resolves the product's *current* price/stock from the store
 * catalogue (real data, via StorePricingService), records a price point for
 * history, and — when the price drops or an out-of-stock item returns —
 * dispatches a webhook + emails the wishlist owner. De-duplicated via the
 * item's notified-at timestamps so repeated sweeps don't spam.
 */
export default class PaymentWishlistPriceWatchService {

  private static currentStock(product: ReturnType<typeof StoreProductSchema.parse>): boolean {
    return product.fulfillmentType === 'DIGITAL_UNLIMITED'
      || StorePricingService.totalStock(product) > 0
      || product.allowBackorder
  }

  /** Price-history for one wishlist item (most recent first). */
  static async getHistory(tenantId: string, wishlistItemId: string, limit = 100) {
    const ds = await tenantDataSourceFor(tenantId)
    return ds.getRepository(PricePointEntity).find({
      where: { tenantId, wishlistItemId }, order: { recordedAt: 'DESC' }, take: limit,
    })
  }

  /**
   * Sweep all wishlist items for a tenant, detect price drops / restocks,
   * persist price points, and fire notifications. Safe to run on a schedule.
   */
  static async sweep(tenantId: string): Promise<PriceWatchResult> {
    const ds = await tenantDataSourceFor(tenantId)
    const items = await ds.getRepository(WishlistItemEntity).find({ where: { tenantId } })
    const result: PriceWatchResult = { scanned: 0, priceDrops: 0, backInStock: 0 }
    if (items.length === 0) return result

    const productRepo = ds.getRepository(ProductEntity)
    const itemRepo = ds.getRepository(WishlistItemEntity)
    const pointRepo = ds.getRepository(PricePointEntity)
    const wishlistRepo = ds.getRepository(WishlistEntity)

    // Prefetch every distinct product referenced by the wishlist items in a
    // single query instead of a findOne the first time each product is seen.
    const productCache = new Map<string, ReturnType<typeof StoreProductSchema.parse> | null>()
    const emailCache = new Map<string, string | null>()
    const distinctProductIds = Array.from(new Set(items.map((i) => i.productId)))
    const productRows = await productRepo.find({ where: { tenantId, productId: In(distinctProductIds) } })
    for (const id of distinctProductIds) productCache.set(id, null)
    for (const row of productRows) productCache.set(row.productId, StoreProductSchema.parse(row))

    for (const item of items) {
      result.scanned++
      const product = productCache.get(item.productId)
      if (!product) continue

      const price = StorePricingService.resolvePrice(product)
      const inStock = this.currentStock(product)

      // Record the observation for history.
      await pointRepo.save(pointRepo.create({
        tenantId, wishlistItemId: item.wishlistItemId, productId: item.productId,
        variantId: item.variantId, price: price.amount, currency: price.currency, inStock,
      })).catch(() => {})

      const priceDrop = item.lastKnownPrice != null && price.amount < item.lastKnownPrice
      const backInStock = item.lastKnownInStock === false && inStock === true

      if (priceDrop) {
        result.priceDrops++
        await this.notify(tenantId, wishlistRepo, emailCache, item.wishlistId, 'wishlist.price_drop', {
          productId: item.productId, oldPrice: item.lastKnownPrice, newPrice: price.amount, currency: price.currency, name: product.name,
        })
        item.notifiedPriceDropAt = new Date()
      }
      if (backInStock) {
        result.backInStock++
        await this.notify(tenantId, wishlistRepo, emailCache, item.wishlistId, 'wishlist.back_in_stock', {
          productId: item.productId, name: product.name, price: price.amount, currency: price.currency,
        })
        item.notifiedBackInStockAt = new Date()
      }

      item.lastKnownPrice = price.amount
      item.lastKnownCurrency = price.currency
      item.lastKnownInStock = inStock
      await itemRepo.save(item).catch(() => {})
    }
    return result
  }

  private static async notify(
    tenantId: string,
    wishlistRepo: ReturnType<Awaited<ReturnType<typeof tenantDataSourceFor>>['getRepository']>,
    emailCache: Map<string, string | null>,
    wishlistId: string,
    event: 'wishlist.price_drop' | 'wishlist.back_in_stock',
    payload: Record<string, unknown>,
  ): Promise<void> {
    await WebhookService.dispatchEvent(tenantId, event, { wishlistId, ...payload })
      .catch((e) => Logger.warn(`[wishlist] ${event} webhook failed: ${e instanceof Error ? e.message : e}`))

    try {
      const wishlist = await wishlistRepo.findOne({ where: { tenantId, wishlistId } }) as { userId?: string } | null
      const userId = wishlist?.userId
      if (!userId) return
      let email = emailCache.get(userId)
      if (email === undefined) {
        const { default: UserService } = await import('@nb/user/server/user.service')
        const user = await UserService.getById(userId).catch(() => null)
        email = user?.email ?? null
        emailCache.set(userId, email)
      }
      if (!email) return
      const { default: NotificationMailQueueService } = await import('@nb/notification_mail/server/notification_mail.queue.service')
      const subject = event === 'wishlist.price_drop'
        ? `Price drop on ${payload.name}` : `${payload.name} is back in stock`
      const html = event === 'wishlist.price_drop'
        ? `<p><strong>${payload.name}</strong> dropped to ${payload.newPrice} ${payload.currency} (was ${payload.oldPrice}).</p>`
        : `<p><strong>${payload.name}</strong> is back in stock at ${payload.price} ${payload.currency}.</p>`
      await NotificationMailQueueService.sendMail(tenantId, email, subject, html)
    } catch (e) {
      Logger.warn(`[wishlist] notify email failed: ${e instanceof Error ? e.message : e}`)
    }
  }
}
