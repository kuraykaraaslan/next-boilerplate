import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import { LessThan } from 'typeorm'
import Logger from '@/modules/logger'
import SettingService from '@/modules/setting/setting.service'
import AuditLogService from '@/modules/audit_log/audit_log.service'
import { Cart as CartEntity } from './entities/cart.entity'
import { CartItem as CartItemEntity } from './entities/cart_item.entity'
import PaymentCartInventoryService from './payment_cart.inventory.service'

/**
 * Cart lifetime + abandonment handling. Active carts get a sliding `expiresAt`
 * (extended on activity by `extend`). A scheduled sweep marks expired carts
 * ABANDONED, releases their stock reservations (so the units return to the
 * pool), and records the abandonment for recovery flows / analytics.
 */
export default class PaymentCartExpiryService {
  /** Per-tenant cart TTL in hours (`cartTtlHours` setting, default 72h). */
  static async ttlMs(tenantId: string): Promise<number> {
    const raw = await SettingService.getValue(tenantId, 'cartTtlHours').catch(() => null)
    const hours = raw ? parseInt(raw, 10) : 0
    return (Number.isFinite(hours) && hours > 0 ? hours : 72) * 60 * 60 * 1000
  }

  /** Slide the cart's expiry forward on activity. */
  static async extend(tenantId: string, cartId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const expiresAt = new Date(Date.now() + (await this.ttlMs(tenantId)))
    await ds.getRepository(CartEntity).update({ tenantId, cartId, status: 'ACTIVE' }, { expiresAt }).catch(() => {})
  }

  /**
   * Mark expired ACTIVE carts as ABANDONED and release their reservations.
   * Returns the abandoned cart ids (so a caller can trigger recovery emails).
   */
  static async sweepAbandoned(tenantId: string): Promise<string[]> {
    const ds = await tenantDataSourceFor(tenantId)
    const cartRepo = ds.getRepository(CartEntity)
    const now = new Date()
    const expired = await cartRepo.find({
      where: { tenantId, status: 'ACTIVE', expiresAt: LessThan(now) },
    })
    if (expired.length === 0) return []

    const abandonedIds: string[] = []
    for (const cart of expired) {
      const items = await ds.getRepository(CartItemEntity).find({ where: { tenantId, cartId: cart.cartId } })
      // Only treat non-empty carts as abandonment events worth recovering.
      const nonEmpty = items.length > 0
      await cartRepo.update({ cartId: cart.cartId }, { status: 'ABANDONED' })
      for (const it of items) {
        await PaymentCartInventoryService.adjustReservation(tenantId, it.productId, it.variantId, -Number(it.quantity))
      }
      if (nonEmpty) {
        abandonedIds.push(cart.cartId)
        AuditLogService.log({
          tenantId, actorType: 'SYSTEM', action: 'cart.abandoned',
          resourceType: 'cart', resourceId: cart.cartId,
          metadata: { items: items.length, userId: cart.userId ?? null },
        }).catch(() => {})
      }
    }
    Logger.info(`[payment_cart.expiry] swept ${expired.length} expired carts for tenant ${tenantId} (${abandonedIds.length} non-empty)`)
    return abandonedIds
  }
}
