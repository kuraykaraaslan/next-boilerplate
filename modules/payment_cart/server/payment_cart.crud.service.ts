import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import redis, { singleFlight } from '@kuraykaraaslan/redis'
import { Cart as CartEntity } from './entities/cart.entity'
import { CartItem as CartItemEntity } from './entities/cart_item.entity'
import {
  SafeCartSchema, CartItemSchema, CartWithItemsSchema,
  type SafeCart, type CartWithItems,
} from './payment_cart.types'
import type { GetOrCreateCartDTO, GetCartsQuery } from './payment_cart.dto'
import { PAYMENT_CART_MESSAGES } from './payment_cart.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'
import PaymentCartCalcService from './payment_cart.calc.service'
import PaymentCartItemService from './payment_cart.item.service'

export { PaymentCartCalcService, PaymentCartItemService }

export default class PaymentCartCrudService {

  static async getOrCreateCart(tenantId: string, dto: GetOrCreateCartDTO): Promise<CartWithItems> {
    if (!dto.userId && !dto.guestToken) throw new AppError(PAYMENT_CART_MESSAGES.INVALID_IDENTIFIER, 422, ErrorCode.VALIDATION_ERROR)

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
    return PaymentCartCrudService.getById(tenantId, cart.cartId)
  }

  static async getById(tenantId: string, cartId: string): Promise<CartWithItems> {
    return singleFlight(`pay:cart:${cartId}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const cart = await ds.getRepository(CartEntity).findOne({ where: { tenantId, cartId } })
      if (!cart) throw new AppError(PAYMENT_CART_MESSAGES.CART_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

      const itemRows = await ds.getRepository(CartItemEntity).find({
        where: { tenantId, cartId },
        order: { createdAt: 'ASC' },
      })
      const items = itemRows.map((r) => CartItemSchema.parse(r))
      const totals = PaymentCartCalcService.computeTotals(items, Number(cart.discountTotal ?? 0))

      return CartWithItemsSchema.parse({
        ...SafeCartSchema.parse(cart),
        items,
        itemCount: totals.itemCount,
        total: totals.total,
      })
    })
  }

  static async list(tenantId: string, query: GetCartsQuery): Promise<{ data: SafeCart[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(CartEntity)
    const where: Record<string, unknown> = { tenantId }
    if (query.userId) where['userId'] = query.userId
    if (query.status) where['status'] = query.status
    const [rows, total] = await repo.findAndCount({
      where, order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize, take: query.pageSize,
    })
    return { data: rows.map((r) => SafeCartSchema.parse(r)), total }
  }

  // Item + coupon + merge delegates
  static addItem             = PaymentCartItemService.addItem.bind(PaymentCartItemService)
  static updateItemQuantity  = PaymentCartItemService.updateItemQuantity.bind(PaymentCartItemService)
  static removeItem          = PaymentCartItemService.removeItem.bind(PaymentCartItemService)
  static clear               = PaymentCartItemService.clear.bind(PaymentCartItemService)
  static applyCoupon         = PaymentCartItemService.applyCoupon.bind(PaymentCartItemService)
  static removeCoupon        = PaymentCartItemService.removeCoupon.bind(PaymentCartItemService)
  static mergeGuestIntoUser  = PaymentCartItemService.mergeGuestIntoUser.bind(PaymentCartItemService)
  static markConverted       = PaymentCartItemService.markConverted.bind(PaymentCartItemService)
}
