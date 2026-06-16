import { tenantDataSourceFor } from '@nb/db'
import redis from '@nb/redis'
import Logger from '@nb/logger'
import { CouponService } from '@nb/coupon'
import { Cart as CartEntity } from './entities/cart.entity'
import { CartItem as CartItemEntity } from './entities/cart_item.entity'
import {
  SafeCartSchema, CartItemSchema, CartWithItemsSchema, CartTotalsSchema,
  type CartItem, type CartWithItems, type CartTotals,
} from './payment_cart.types'
import { PAYMENT_CART_MESSAGES } from './payment_cart.messages'
import { AppError, ErrorCode } from '@nb/common/server/app-error'

export default class PaymentCartCalcService {

  static computeTotals(items: CartItem[], discountTotal = 0): CartTotals {
    const subtotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.quantity), 0)
    const itemCount = items.reduce((sum, i) => sum + Number(i.quantity), 0)
    const clampedDiscount = Math.min(Math.max(0, Number(discountTotal) || 0), subtotal)
    const total = Math.max(0, subtotal - clampedDiscount)
    return CartTotalsSchema.parse({ subtotal, discountTotal: clampedDiscount, total, itemCount })
  }

  static async resolveCouponDiscount(
    tenantId: string, code: string, subtotal: number, currency: string, items: CartItem[],
  ): Promise<number | null> {
    try {
      const productIds = [...new Set(items.map((i) => i.productId).filter((id): id is string => !!id))]
      const result = await CouponService.validate({
        code,
        tenantId,
        currency,
        ...(subtotal > 0 ? { amount: subtotal } : {}),
        ...(productIds.length > 0 ? { productIds } : {}),
      })
      if (!result.valid) return null
      return Math.min(Number(result.discountAmount ?? 0), subtotal)
    } catch (error) {
      Logger.warn(`Cart coupon validation failed for "${code}": ${error}`)
      return null
    }
  }

  static async recalcAndSave(tenantId: string, cartId: string): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const cartRepo = ds.getRepository(CartEntity)
    const itemRepo = ds.getRepository(CartItemEntity)

    const cart = await cartRepo.findOne({ where: { tenantId, cartId } })
    if (!cart) throw new AppError(PAYMENT_CART_MESSAGES.CART_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    const itemRows = await itemRepo.find({ where: { tenantId, cartId }, order: { createdAt: 'ASC' } })
    const items = itemRows.map((r) => CartItemSchema.parse(r))
    const subtotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.quantity), 0)

    let discount = 0
    if (cart.couponCode) {
      const resolved = await PaymentCartCalcService.resolveCouponDiscount(
        tenantId, cart.couponCode, subtotal, cart.currency, items,
      )
      if (resolved === null) cart.couponCode = null
      else discount = resolved
    }

    const totals = PaymentCartCalcService.computeTotals(items, discount)
    cart.subtotal = totals.subtotal
    cart.discountTotal = totals.discountTotal
    const savedCart = await cartRepo.save(cart)

    await redis.del(`pay:cart:${cartId}`)

    return CartWithItemsSchema.parse({
      ...SafeCartSchema.parse(savedCart),
      items,
      itemCount: totals.itemCount,
      total: totals.total,
    })
  }
}
