import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { IsNull } from 'typeorm'
import { tenantDataSourceFor } from '@/modules/db'
import { singleFlight } from '@/modules/redis'
import Logger from '@/modules/logger'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { Wishlist as WishlistEntity } from './entities/wishlist.entity'
import { WishlistItem as WishlistItemEntity } from './entities/wishlist_item.entity'
import {
  SafeWishlistSchema, WishlistWithItemsSchema,
  type SafeWishlist, type WishlistWithItems,
} from './payment_wishlist.types'
import type {
  CreateWishlistDTO, UpdateWishlistDTO, AddWishlistItemDTO, GetWishlistsQuery,
} from './payment_wishlist.dto'
import { PAYMENT_WISHLIST_MESSAGES } from './payment_wishlist.messages'

export default class PaymentWishlistService {

  // ============================================================================
  // Internal helpers
  // ============================================================================

  private static async buildWithItems(tenantId: string, wishlistId: string): Promise<WishlistWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const wishlist = await ds.getRepository(WishlistEntity).findOne({ where: { tenantId, wishlistId } })
    if (!wishlist) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const items = await ds.getRepository(WishlistItemEntity).find({
      where: { tenantId, wishlistId },
      order: { createdAt: 'DESC' },
    })
    return WishlistWithItemsSchema.parse({ ...wishlist, items, itemCount: items.length })
  }

  // ============================================================================
  // Wishlist CRUD
  // ============================================================================

  static async getOrCreateDefault(tenantId: string, userId: string): Promise<WishlistWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(WishlistEntity)
    let wishlist = await repo.findOne({ where: { tenantId, userId, name: 'Default' } })
    if (!wishlist) {
      wishlist = await repo.save(repo.create({ tenantId, userId, name: 'Default', isPublic: false }))
    }
    return PaymentWishlistService.buildWithItems(tenantId, wishlist.wishlistId)
  }

  static async create(tenantId: string, dto: CreateWishlistDTO): Promise<SafeWishlist> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(WishlistEntity)
    try {
      const wishlist = repo.create({
        tenantId,
        userId: dto.userId,
        name: dto.name,
        isPublic: dto.isPublic,
        shareToken: dto.isPublic ? randomUUID() : undefined,
        metadata: dto.metadata,
      })
      const saved = await repo.save(wishlist)
      return SafeWishlistSchema.parse(saved)
    } catch (error) {
      Logger.error(`${PAYMENT_WISHLIST_MESSAGES.WISHLIST_CREATE_FAILED}: ${error}`)
      throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async getById(tenantId: string, wishlistId: string): Promise<WishlistWithItems> {
    return singleFlight(`wishlist:${wishlistId}`, async () => {
      return PaymentWishlistService.buildWithItems(tenantId, wishlistId)
    })
  }

  static async getByShareToken(tenantId: string, shareToken: string): Promise<WishlistWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const wishlist = await ds.getRepository(WishlistEntity).findOne({ where: { tenantId, shareToken } })
    if (!wishlist) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (!wishlist.isPublic) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_PUBLIC, 403, ErrorCode.FORBIDDEN)
    return PaymentWishlistService.buildWithItems(tenantId, wishlist.wishlistId)
  }

  static async update(tenantId: string, wishlistId: string, dto: UpdateWishlistDTO): Promise<SafeWishlist> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(WishlistEntity)
    const wishlist = await repo.findOne({ where: { tenantId, wishlistId } })
    if (!wishlist) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    Object.assign(wishlist, dto)
    if (wishlist.isPublic && !wishlist.shareToken) wishlist.shareToken = randomUUID()

    const saved = await repo.save(wishlist)
    return SafeWishlistSchema.parse(saved)
  }

  static async list(tenantId: string, query: GetWishlistsQuery): Promise<{ data: SafeWishlist[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(WishlistEntity)
    const where: Record<string, unknown> = { tenantId }
    if (query.userId) where['userId'] = query.userId

    const [rows, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data: rows.map((r) => SafeWishlistSchema.parse(r)), total }
  }

  static async delete(tenantId: string, wishlistId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(WishlistEntity)
    const wishlist = await repo.findOne({ where: { tenantId, wishlistId } })
    if (!wishlist) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(wishlist)
  }

  // ============================================================================
  // Wishlist Items
  // ============================================================================

  static async addItem(tenantId: string, wishlistId: string, dto: AddWishlistItemDTO): Promise<WishlistWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const wishlistRepo = ds.getRepository(WishlistEntity)
    const wishlist = await wishlistRepo.findOne({ where: { tenantId, wishlistId } })
    if (!wishlist) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    const itemRepo = ds.getRepository(WishlistItemEntity)
    const existing = await itemRepo.findOne({
      where: {
        tenantId,
        wishlistId,
        productId: dto.productId,
        variantId: dto.variantId ?? IsNull(),
      },
    })
    if (!existing) {
      try {
        await itemRepo.save(itemRepo.create({
          tenantId,
          wishlistId,
          productId: dto.productId,
          variantId: dto.variantId,
          note: dto.note,
        }))
      } catch (error) {
        Logger.error(`${PAYMENT_WISHLIST_MESSAGES.WISHLIST_ITEM_ADD_FAILED}: ${error}`)
        throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_ITEM_ADD_FAILED, 500, ErrorCode.INTERNAL_ERROR)
      }
    }

    return PaymentWishlistService.buildWithItems(tenantId, wishlistId)
  }

  static async removeItem(tenantId: string, wishlistId: string, wishlistItemId: string): Promise<WishlistWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const itemRepo = ds.getRepository(WishlistItemEntity)
    const item = await itemRepo.findOne({ where: { tenantId, wishlistId, wishlistItemId } })
    if (!item) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await itemRepo.remove(item)
    return PaymentWishlistService.buildWithItems(tenantId, wishlistId)
  }

  static async moveItem(
    tenantId: string,
    fromWishlistId: string,
    toWishlistId: string,
    wishlistItemId: string,
  ): Promise<WishlistWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const wishlistRepo = ds.getRepository(WishlistEntity)
    const dest = await wishlistRepo.findOne({ where: { tenantId, wishlistId: toWishlistId } })
    if (!dest) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    const itemRepo = ds.getRepository(WishlistItemEntity)
    const item = await itemRepo.findOne({ where: { tenantId, wishlistId: fromWishlistId, wishlistItemId } })
    if (!item) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    item.wishlistId = toWishlistId
    await itemRepo.save(item)
    return PaymentWishlistService.buildWithItems(tenantId, toWishlistId)
  }

  static async clear(tenantId: string, wishlistId: string): Promise<WishlistWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const wishlistRepo = ds.getRepository(WishlistEntity)
    const wishlist = await wishlistRepo.findOne({ where: { tenantId, wishlistId } })
    if (!wishlist) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    await ds.getRepository(WishlistItemEntity).delete({ tenantId, wishlistId })
    return PaymentWishlistService.buildWithItems(tenantId, wishlistId)
  }

  // ============================================================================
  // Cart conversion
  // ============================================================================

  /**
   * Add every in-stock wishlist item to the owner's active cart in one action.
   * Resolves each product's live price/name from the store catalogue and marks
   * the wishlist item as converted (addedToCartAt) for conversion analytics.
   */
  static async addAllToCart(
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
  static async markAddedToCart(tenantId: string, wishlistItemId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    await ds.getRepository(WishlistItemEntity).update({ tenantId, wishlistItemId }, { addedToCartAt: new Date() })
  }

  /** Wishlist→cart conversion stats for a tenant (optionally one wishlist). */
  static async conversionStats(tenantId: string, wishlistId?: string): Promise<{ total: number; converted: number; rate: number }> {
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

  // ============================================================================
  // GDPR — data portability + erasure
  // ============================================================================

  /** Export every wishlist + items for a user (GDPR data portability). */
  static async exportForUser(tenantId: string, userId: string): Promise<unknown> {
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
  static async eraseForUser(tenantId: string, userId: string): Promise<{ wishlists: number; items: number }> {
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
}
