import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight } from '@/modules/redis'
import Logger from '@/modules/logger'
import { env } from '@/modules/env'
import { CouponService } from '@/modules/coupon'
import { Cart as CartEntity } from './entities/cart.entity'
import { CartItem as CartItemEntity } from './entities/cart_item.entity'
import {
  SafeCartSchema, CartItemSchema, CartWithItemsSchema, CartTotalsSchema,
  type SafeCart, type CartItem, type CartWithItems, type CartTotals,
} from './payment_cart.types'
import type {
  AddCartItemDTO, GetOrCreateCartDTO, ApplyCouponDTO, GetCartsQuery,
} from './payment_cart.dto'
import { PAYMENT_CART_MESSAGES } from './payment_cart.messages'

const CACHE_TTL = env.TENANT_CACHE_TTL ?? 300

export default class PaymentCartService {

  // ============================================================================
  // Totals helpers
  // ============================================================================

  private static computeTotals(items: CartItem[], discountTotal = 0): CartTotals {
    const subtotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.quantity), 0)
    const itemCount = items.reduce((sum, i) => sum + Number(i.quantity), 0)
    // Clamp the (coupon-resolved) discount so it can never exceed the subtotal.
    const clampedDiscount = Math.min(Math.max(0, Number(discountTotal) || 0), subtotal)
    const total = Math.max(0, subtotal - clampedDiscount)
    return CartTotalsSchema.parse({ subtotal, discountTotal: clampedDiscount, total, itemCount })
  }

  /**
   * Resolve the discount for the cart's applied coupon against the current subtotal.
   * Returns the discount amount, or `null` if the coupon is no longer valid (so the
   * caller can drop it). Validation is delegated to the coupon module.
   */
  private static async resolveCouponDiscount(
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

  private static async recalcAndSave(tenantId: string, cartId: string): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const cartRepo = ds.getRepository(CartEntity)
    const itemRepo = ds.getRepository(CartItemEntity)

    const cart = await cartRepo.findOne({ where: { tenantId, cartId } })
    if (!cart) throw new Error(PAYMENT_CART_MESSAGES.CART_NOT_FOUND)

    const itemRows = await itemRepo.find({ where: { tenantId, cartId }, order: { createdAt: 'ASC' } })
    const items = itemRows.map((r) => CartItemSchema.parse(r))
    const subtotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.quantity), 0)

    // Re-resolve the coupon discount every time items change. If the coupon stopped
    // being valid (expired, min-amount no longer met, …), drop it from the cart.
    let discount = 0
    if (cart.couponCode) {
      const resolved = await PaymentCartService.resolveCouponDiscount(
        tenantId, cart.couponCode, subtotal, cart.currency, items,
      )
      if (resolved === null) cart.couponCode = null
      else discount = resolved
    }

    const totals = PaymentCartService.computeTotals(items, discount)

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

  // ============================================================================
  // Cart lifecycle
  // ============================================================================

  static async getOrCreateCart(tenantId: string, dto: GetOrCreateCartDTO): Promise<CartWithItems> {
    if (!dto.userId && !dto.guestToken) throw new Error(PAYMENT_CART_MESSAGES.INVALID_IDENTIFIER)

    const ds = await tenantDataSourceFor(tenantId)
    const cartRepo = ds.getRepository(CartEntity)

    const where = dto.userId
      ? { tenantId, userId: dto.userId, status: 'ACTIVE' }
      : { tenantId, guestToken: dto.guestToken, status: 'ACTIVE' }

    let cart = await cartRepo.findOne({ where, order: { createdAt: 'DESC' } })
    if (!cart) {
      cart = await cartRepo.save(cartRepo.create({
        tenantId,
        userId: dto.userId,
        guestToken: dto.guestToken,
        status: 'ACTIVE',
        currency: dto.currency,
      }))
    }

    return PaymentCartService.getById(tenantId, cart.cartId)
  }

  static async getById(tenantId: string, cartId: string): Promise<CartWithItems> {
    return singleFlight(`pay:cart:${cartId}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const cart = await ds.getRepository(CartEntity).findOne({ where: { tenantId, cartId } })
      if (!cart) throw new Error(PAYMENT_CART_MESSAGES.CART_NOT_FOUND)

      const itemRows = await ds.getRepository(CartItemEntity).find({
        where: { tenantId, cartId },
        order: { createdAt: 'ASC' },
      })
      const items = itemRows.map((r) => CartItemSchema.parse(r))
      const totals = PaymentCartService.computeTotals(items, Number(cart.discountTotal ?? 0))

      return CartWithItemsSchema.parse({
        ...SafeCartSchema.parse(cart),
        items,
        itemCount: totals.itemCount,
        total: totals.total,
      })
    })
  }

  // ============================================================================
  // Items
  // ============================================================================

  static async addItem(tenantId: string, cartId: string, dto: AddCartItemDTO): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const cartRepo = ds.getRepository(CartEntity)
    const itemRepo = ds.getRepository(CartItemEntity)

    const cart = await cartRepo.findOne({ where: { tenantId, cartId } })
    if (!cart) throw new Error(PAYMENT_CART_MESSAGES.CART_NOT_FOUND)
    if (cart.status !== 'ACTIVE') throw new Error(PAYMENT_CART_MESSAGES.CART_NOT_ACTIVE)

    const existing = await itemRepo.findOne({
      where: {
        tenantId,
        cartId,
        productId: dto.productId ?? undefined,
        variantId: dto.variantId ?? undefined,
      },
    })

    if (existing && existing.productId === (dto.productId ?? undefined) && existing.variantId === (dto.variantId ?? undefined)) {
      existing.quantity = Number(existing.quantity) + Number(dto.quantity)
      await itemRepo.save(existing)
    } else {
      await itemRepo.save(itemRepo.create({
        tenantId,
        cartId,
        productId: dto.productId,
        variantId: dto.variantId,
        sku: dto.sku,
        name: dto.name,
        unitPrice: dto.unitPrice,
        quantity: dto.quantity,
        metadata: dto.metadata,
      }))
    }

    return PaymentCartService.recalcAndSave(tenantId, cartId)
  }

  static async updateItemQuantity(tenantId: string, cartId: string, cartItemId: string, quantity: number): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const itemRepo = ds.getRepository(CartItemEntity)

    const item = await itemRepo.findOne({ where: { tenantId, cartId, cartItemId } })
    if (!item) throw new Error(PAYMENT_CART_MESSAGES.CART_ITEM_NOT_FOUND)

    if (quantity <= 0) {
      await itemRepo.remove(item)
    } else {
      item.quantity = quantity
      await itemRepo.save(item)
    }

    return PaymentCartService.recalcAndSave(tenantId, cartId)
  }

  static async removeItem(tenantId: string, cartId: string, cartItemId: string): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const itemRepo = ds.getRepository(CartItemEntity)

    const item = await itemRepo.findOne({ where: { tenantId, cartId, cartItemId } })
    if (!item) throw new Error(PAYMENT_CART_MESSAGES.CART_ITEM_NOT_FOUND)
    await itemRepo.remove(item)

    return PaymentCartService.recalcAndSave(tenantId, cartId)
  }

  static async clear(tenantId: string, cartId: string): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const cartRepo = ds.getRepository(CartEntity)
    const itemRepo = ds.getRepository(CartItemEntity)

    const cart = await cartRepo.findOne({ where: { tenantId, cartId } })
    if (!cart) throw new Error(PAYMENT_CART_MESSAGES.CART_NOT_FOUND)

    await itemRepo.delete({ tenantId, cartId })

    return PaymentCartService.recalcAndSave(tenantId, cartId)
  }

  // ============================================================================
  // Coupons
  // ============================================================================

  static async applyCoupon(tenantId: string, cartId: string, dto: ApplyCouponDTO): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const cartRepo = ds.getRepository(CartEntity)

    const cart = await cartRepo.findOne({ where: { tenantId, cartId } })
    if (!cart) throw new Error(PAYMENT_CART_MESSAGES.CART_NOT_FOUND)

    // Validate the code up-front (against the current subtotal) so an invalid coupon
    // is rejected to the caller instead of silently ignored. recalcAndSave then
    // re-resolves and persists the discount.
    const itemRows = await ds.getRepository(CartItemEntity).find({ where: { tenantId, cartId } })
    const items = itemRows.map((r) => CartItemSchema.parse(r))
    const subtotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.quantity), 0)
    const discount = await PaymentCartService.resolveCouponDiscount(
      tenantId, dto.couponCode, subtotal, cart.currency, items,
    )
    if (discount === null) throw new Error(PAYMENT_CART_MESSAGES.COUPON_INVALID)

    cart.couponCode = dto.couponCode
    await cartRepo.save(cart)
    await redis.del(`pay:cart:${cartId}`)

    return PaymentCartService.recalcAndSave(tenantId, cartId)
  }

  static async removeCoupon(tenantId: string, cartId: string): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const cartRepo = ds.getRepository(CartEntity)

    const cart = await cartRepo.findOne({ where: { tenantId, cartId } })
    if (!cart) throw new Error(PAYMENT_CART_MESSAGES.CART_NOT_FOUND)

    cart.couponCode = null
    await cartRepo.save(cart)
    await redis.del(`pay:cart:${cartId}`)

    return PaymentCartService.recalcAndSave(tenantId, cartId)
  }

  // ============================================================================
  // Merge & conversion
  // ============================================================================

  static async mergeGuestIntoUser(tenantId: string, guestToken: string, userId: string): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const cartRepo = ds.getRepository(CartEntity)
    const itemRepo = ds.getRepository(CartItemEntity)

    const guestCart = await cartRepo.findOne({
      where: { tenantId, guestToken, status: 'ACTIVE' },
      order: { createdAt: 'DESC' },
    })
    if (!guestCart) throw new Error(PAYMENT_CART_MESSAGES.GUEST_CART_NOT_FOUND)

    const userCart = await PaymentCartService.getOrCreateCart(tenantId, { userId, currency: guestCart.currency })

    try {
      const guestItems = await itemRepo.find({ where: { tenantId, cartId: guestCart.cartId } })
      for (const gi of guestItems) {
        const existing = await itemRepo.findOne({
          where: {
            tenantId,
            cartId: userCart.cartId,
            productId: gi.productId ?? undefined,
            variantId: gi.variantId ?? undefined,
          },
        })
        if (existing && existing.productId === (gi.productId ?? undefined) && existing.variantId === (gi.variantId ?? undefined)) {
          existing.quantity = Number(existing.quantity) + Number(gi.quantity)
          await itemRepo.save(existing)
          await itemRepo.remove(gi)
        } else {
          gi.cartId = userCart.cartId
          await itemRepo.save(gi)
        }
      }

      guestCart.status = 'MERGED'
      await cartRepo.save(guestCart)
      await redis.del(`pay:cart:${guestCart.cartId}`)
    } catch (error) {
      Logger.error(`${PAYMENT_CART_MESSAGES.MERGE_FAILED}: ${error}`)
      throw new Error(PAYMENT_CART_MESSAGES.MERGE_FAILED)
    }

    return PaymentCartService.recalcAndSave(tenantId, userCart.cartId)
  }

  static async markConverted(tenantId: string, cartId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const cartRepo = ds.getRepository(CartEntity)

    const cart = await cartRepo.findOne({ where: { tenantId, cartId } })
    if (!cart) throw new Error(PAYMENT_CART_MESSAGES.CART_NOT_FOUND)

    cart.status = 'CONVERTED'
    await cartRepo.save(cart)
    await redis.del(`pay:cart:${cartId}`)
  }

  // ============================================================================
  // Listing
  // ============================================================================

  static async list(tenantId: string, query: GetCartsQuery): Promise<{ data: SafeCart[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(CartEntity)
    const where: Record<string, unknown> = { tenantId }
    if (query.userId) where['userId'] = query.userId
    if (query.status) where['status'] = query.status

    const [rows, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data: rows.map((r) => SafeCartSchema.parse(r)), total }
  }
}
