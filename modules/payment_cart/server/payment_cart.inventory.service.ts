import 'reflect-metadata'
import { tenantDataSourceFor } from '@nb/db'
import redis from '@nb/redis'
import Logger from '@nb/logger'
import { AppError, ErrorCode } from '@nb/common/server/app-error'
import { StoreProduct } from '@nb/store/server/entities/store_product.entity'
import { StoreProductVariant } from '@nb/store/server/entities/store_product_variant.entity'
import { PAYMENT_CART_MESSAGES } from './payment_cart.messages'

/**
 * Authoritative pricing + stock reservation for the cart, sourced from the
 * `store` catalog (real source of truth — not the client). Two protections:
 *
 *  - **Price validation**: the cart never trusts a client-supplied unit price
 *    for a catalogue product; it uses the store's current price (blocks price
 *    manipulation).
 *  - **Stock reservation**: when inventory is tracked, units are reserved in
 *    Redis so concurrent carts cannot oversell. Reservations carry a TTL tied to
 *    the cart's lifetime and are released on remove / clear / expiry / convert.
 */
export interface ResolvedCatalogLine {
  unitPrice: number
  /** Available stock (after existing reservations); null = not tracked. */
  available: number | null
  trackInventory: boolean
}

const RESERVE_TTL_SEC = 60 * 60 * 24 // 24h safety TTL (cart expiry releases sooner)

export default class PaymentCartInventoryService {
  private static stockKey(tenantId: string, productId: string, variantId?: string | null): string {
    return `cart:reserve:${tenantId}:${productId}:${variantId ?? '-'}`
  }

  /**
   * Resolve the authoritative unit price + current availability for a catalogue
   * line. Returns null for ad-hoc lines (no productId) — those keep their
   * caller-supplied price. Throws when a referenced product/variant is missing
   * or inactive.
   */
  static async resolve(tenantId: string, productId?: string | null, variantId?: string | null): Promise<ResolvedCatalogLine | null> {
    if (!productId) return null
    const ds = await tenantDataSourceFor(tenantId)
    const product = await ds.getRepository(StoreProduct).findOne({ where: { tenantId, productId } })
    if (!product || product.status !== 'ACTIVE') {
      throw new AppError(PAYMENT_CART_MESSAGES.PRODUCT_UNAVAILABLE, 409, ErrorCode.CONFLICT)
    }

    let price = Number(product.basePrice)
    let stock: number | null = product.trackInventory ? (product.stockQuantity ?? 0) : null
    let track = product.trackInventory

    if (variantId) {
      const variant = await ds.getRepository(StoreProductVariant).findOne({ where: { tenantId, variantId, productId } })
      if (!variant || !variant.isActive) throw new AppError(PAYMENT_CART_MESSAGES.PRODUCT_UNAVAILABLE, 409, ErrorCode.CONFLICT)
      if (variant.price != null) price = Number(variant.price)
      if (variant.stockQuantity != null) { stock = variant.stockQuantity; track = true }
    }

    let available: number | null = stock
    if (track && stock != null) {
      const reserved = Number(await redis.get(this.stockKey(tenantId, productId, variantId)).catch(() => 0)) || 0
      available = Math.max(0, stock - reserved)
    }
    return { unitPrice: price, available, trackInventory: track }
  }

  /** Reserve `delta` additional units (delta may be negative to release). */
  static async adjustReservation(tenantId: string, productId: string | null | undefined, variantId: string | null | undefined, delta: number): Promise<void> {
    if (!productId || delta === 0) return
    const key = this.stockKey(tenantId, productId, variantId)
    try {
      const next = await redis.incrby(key, delta)
      if (next <= 0) await redis.del(key)
      else await redis.expire(key, RESERVE_TTL_SEC)
    } catch (err) {
      Logger.warn(`[payment_cart.inventory] reservation adjust failed (fail-open): ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /** Assert enough stock is available for `requestedQty`, else throw. */
  static assertAvailable(line: ResolvedCatalogLine | null, requestedQty: number): void {
    if (!line || !line.trackInventory || line.available == null) return
    if (requestedQty > line.available) {
      throw new AppError(PAYMENT_CART_MESSAGES.INSUFFICIENT_STOCK, 409, ErrorCode.CONFLICT)
    }
  }
}
