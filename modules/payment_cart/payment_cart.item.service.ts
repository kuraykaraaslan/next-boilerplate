import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import { IsNull } from 'typeorm'
import redis from '@/modules/redis'
import Logger from '@/modules/logger'
import { Cart as CartEntity } from './entities/cart.entity'
import { CartItem as CartItemEntity } from './entities/cart_item.entity'
import {
  CartItemSchema, CartWithItemsSchema,
  type CartWithItems,
} from './payment_cart.types'
import type { AddCartItemDTO, ApplyCouponDTO } from './payment_cart.dto'
import { PAYMENT_CART_MESSAGES } from './payment_cart.messages'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import AuditLogService from '@/modules/audit_log/audit_log.service'
import PaymentCartCalcService from './payment_cart.calc.service'

export default class PaymentCartItemService {

  static async addItem(tenantId: string, cartId: string, dto: AddCartItemDTO): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const cartRepo = ds.getRepository(CartEntity)
    const itemRepo = ds.getRepository(CartItemEntity)

    const cart = await cartRepo.findOne({ where: { tenantId, cartId } })
    if (!cart) throw new AppError(PAYMENT_CART_MESSAGES.CART_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (cart.status !== 'ACTIVE') throw new AppError(PAYMENT_CART_MESSAGES.CART_NOT_ACTIVE, 409, ErrorCode.CONFLICT)

    const existing = await itemRepo.findOne({
      where: {
        tenantId, cartId,
        productId: dto.productId ?? IsNull(),
        variantId: dto.variantId ?? IsNull(),
      },
    })

    if (existing && existing.productId === (dto.productId ?? null) && existing.variantId === (dto.variantId ?? null)) {
      existing.quantity = Number(existing.quantity) + Number(dto.quantity)
      await itemRepo.save(existing)
    } else {
      await itemRepo.save(itemRepo.create({
        tenantId, cartId,
        productId: dto.productId,
        variantId: dto.variantId,
        sku: dto.sku,
        name: dto.name,
        unitPrice: dto.unitPrice,
        quantity: dto.quantity,
        metadata: dto.metadata,
      }))
    }

    return PaymentCartCalcService.recalcAndSave(tenantId, cartId)
  }

  static async updateItemQuantity(tenantId: string, cartId: string, cartItemId: string, quantity: number): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const itemRepo = ds.getRepository(CartItemEntity)
    const item = await itemRepo.findOne({ where: { tenantId, cartId, cartItemId } })
    if (!item) throw new AppError(PAYMENT_CART_MESSAGES.CART_ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    if (quantity <= 0) {
      await itemRepo.remove(item)
    } else {
      item.quantity = quantity
      await itemRepo.save(item)
    }
    return PaymentCartCalcService.recalcAndSave(tenantId, cartId)
  }

  static async removeItem(tenantId: string, cartId: string, cartItemId: string): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const itemRepo = ds.getRepository(CartItemEntity)
    const item = await itemRepo.findOne({ where: { tenantId, cartId, cartItemId } })
    if (!item) throw new AppError(PAYMENT_CART_MESSAGES.CART_ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await itemRepo.remove(item)
    return PaymentCartCalcService.recalcAndSave(tenantId, cartId)
  }

  static async clear(tenantId: string, cartId: string): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const cart = await ds.getRepository(CartEntity).findOne({ where: { tenantId, cartId } })
    if (!cart) throw new AppError(PAYMENT_CART_MESSAGES.CART_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await ds.getRepository(CartItemEntity).delete({ tenantId, cartId })
    return PaymentCartCalcService.recalcAndSave(tenantId, cartId)
  }

  static async applyCoupon(tenantId: string, cartId: string, dto: ApplyCouponDTO): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const cartRepo = ds.getRepository(CartEntity)
    const cart = await cartRepo.findOne({ where: { tenantId, cartId } })
    if (!cart) throw new AppError(PAYMENT_CART_MESSAGES.CART_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    const itemRows = await ds.getRepository(CartItemEntity).find({ where: { tenantId, cartId } })
    const items = itemRows.map((r) => CartItemSchema.parse(r))
    const subtotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.quantity), 0)
    const discount = await PaymentCartCalcService.resolveCouponDiscount(
      tenantId, dto.couponCode, subtotal, cart.currency, items,
    )
    if (discount === null) throw new AppError(PAYMENT_CART_MESSAGES.COUPON_INVALID, 422, ErrorCode.VALIDATION_ERROR)

    cart.couponCode = dto.couponCode
    await cartRepo.save(cart)

    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'cart.coupon_applied',
      resourceType: 'cart', resourceId: cartId,
      metadata: { couponCode: dto.couponCode },
    }).catch(() => {})

    return PaymentCartCalcService.recalcAndSave(tenantId, cartId)
  }

  static async removeCoupon(tenantId: string, cartId: string): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const cartRepo = ds.getRepository(CartEntity)
    const cart = await cartRepo.findOne({ where: { tenantId, cartId } })
    if (!cart) throw new AppError(PAYMENT_CART_MESSAGES.CART_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    const removedCode = cart.couponCode
    cart.couponCode = null
    await cartRepo.save(cart)

    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'cart.coupon_removed',
      resourceType: 'cart', resourceId: cartId,
      metadata: { couponCode: removedCode },
    }).catch(() => {})

    return PaymentCartCalcService.recalcAndSave(tenantId, cartId)
  }

  static async mergeGuestIntoUser(tenantId: string, guestToken: string, userId: string): Promise<CartWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const cartRepo = ds.getRepository(CartEntity)
    const itemRepo = ds.getRepository(CartItemEntity)

    const guestCart = await cartRepo.findOne({
      where: { tenantId, guestToken, status: 'ACTIVE' },
      order: { createdAt: 'DESC' },
    })
    if (!guestCart) throw new AppError(PAYMENT_CART_MESSAGES.GUEST_CART_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    // Import from parent facade to avoid circular dep — crud service re-exposes this
    const { default: PaymentCartCrudService } = await import('./payment_cart.crud.service')
    const userCart = await PaymentCartCrudService.getOrCreateCart(tenantId, { userId, currency: guestCart.currency })

    try {
      await ds.transaction(async (manager) => {
        const txItemRepo = manager.getRepository(CartItemEntity)
        const txCartRepo = manager.getRepository(CartEntity)

        const guestItems = await txItemRepo.find({ where: { tenantId, cartId: guestCart.cartId } })
        for (const gi of guestItems) {
          const existing = await txItemRepo.findOne({
            where: {
              tenantId, cartId: userCart.cartId,
              productId: gi.productId ?? IsNull(),
              variantId: gi.variantId ?? IsNull(),
            },
          })
          if (existing && existing.productId === (gi.productId ?? null) && existing.variantId === (gi.variantId ?? null)) {
            existing.quantity = Number(existing.quantity) + Number(gi.quantity)
            await txItemRepo.save(existing)
            await txItemRepo.remove(gi)
          } else {
            gi.cartId = userCart.cartId
            await txItemRepo.save(gi)
          }
        }
        guestCart.status = 'MERGED'
        await txCartRepo.save(guestCart)
      })
      await redis.del(`pay:cart:${guestCart.cartId}`)
    } catch (error) {
      Logger.error(`${PAYMENT_CART_MESSAGES.MERGE_FAILED}: ${error}`)
      throw new AppError(PAYMENT_CART_MESSAGES.MERGE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }

    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'cart.guest_merged',
      resourceType: 'cart', resourceId: userCart.cartId,
      metadata: { guestCartId: guestCart.cartId, userId },
    }).catch(() => {})

    return PaymentCartCalcService.recalcAndSave(tenantId, userCart.cartId)
  }

  static async markConverted(tenantId: string, cartId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const cartRepo = ds.getRepository(CartEntity)
    const cart = await cartRepo.findOne({ where: { tenantId, cartId } })
    if (!cart) throw new AppError(PAYMENT_CART_MESSAGES.CART_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    cart.status = 'CONVERTED'
    await cartRepo.save(cart)
    await redis.del(`pay:cart:${cartId}`)

    AuditLogService.log({
      tenantId, actorType: 'SYSTEM', action: 'cart.converted',
      resourceType: 'cart', resourceId: cartId,
    }).catch(() => {})
  }
}
