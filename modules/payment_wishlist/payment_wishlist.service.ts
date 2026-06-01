import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { IsNull } from 'typeorm'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight } from '@/modules/redis'
import Logger from '@/modules/logger'
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

  private static cacheKey(wishlistId: string): string {
    return `wishlist:${wishlistId}`
  }

  // ============================================================================
  // Internal helpers
  // ============================================================================

  private static async buildWithItems(tenantId: string, wishlistId: string): Promise<WishlistWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const wishlist = await ds.getRepository(WishlistEntity).findOne({ where: { tenantId, wishlistId } })
    if (!wishlist) throw new Error(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND)
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
      throw new Error(PAYMENT_WISHLIST_MESSAGES.WISHLIST_CREATE_FAILED)
    }
  }

  static async getById(tenantId: string, wishlistId: string): Promise<WishlistWithItems> {
    return singleFlight(PaymentWishlistService.cacheKey(wishlistId), async () => {
      return PaymentWishlistService.buildWithItems(tenantId, wishlistId)
    })
  }

  static async getByShareToken(tenantId: string, shareToken: string): Promise<WishlistWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const wishlist = await ds.getRepository(WishlistEntity).findOne({ where: { tenantId, shareToken } })
    if (!wishlist) throw new Error(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND)
    if (!wishlist.isPublic) throw new Error(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_PUBLIC)
    return PaymentWishlistService.buildWithItems(tenantId, wishlist.wishlistId)
  }

  static async update(tenantId: string, wishlistId: string, dto: UpdateWishlistDTO): Promise<SafeWishlist> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(WishlistEntity)
    const wishlist = await repo.findOne({ where: { tenantId, wishlistId } })
    if (!wishlist) throw new Error(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND)

    Object.assign(wishlist, dto)
    if (wishlist.isPublic && !wishlist.shareToken) wishlist.shareToken = randomUUID()

    const saved = await repo.save(wishlist)
    await redis.del(PaymentWishlistService.cacheKey(wishlistId))
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
    if (!wishlist) throw new Error(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND)
    await repo.softRemove(wishlist)
    await redis.del(PaymentWishlistService.cacheKey(wishlistId))
  }

  // ============================================================================
  // Wishlist Items
  // ============================================================================

  static async addItem(tenantId: string, wishlistId: string, dto: AddWishlistItemDTO): Promise<WishlistWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const wishlistRepo = ds.getRepository(WishlistEntity)
    const wishlist = await wishlistRepo.findOne({ where: { tenantId, wishlistId } })
    if (!wishlist) throw new Error(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND)

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
        throw new Error(PAYMENT_WISHLIST_MESSAGES.WISHLIST_ITEM_ADD_FAILED)
      }
    }

    await redis.del(PaymentWishlistService.cacheKey(wishlistId))
    return PaymentWishlistService.buildWithItems(tenantId, wishlistId)
  }

  static async removeItem(tenantId: string, wishlistId: string, wishlistItemId: string): Promise<WishlistWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const itemRepo = ds.getRepository(WishlistItemEntity)
    const item = await itemRepo.findOne({ where: { tenantId, wishlistId, wishlistItemId } })
    if (!item) throw new Error(PAYMENT_WISHLIST_MESSAGES.WISHLIST_ITEM_NOT_FOUND)
    await itemRepo.remove(item)
    await redis.del(PaymentWishlistService.cacheKey(wishlistId))
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
    if (!dest) throw new Error(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND)

    const itemRepo = ds.getRepository(WishlistItemEntity)
    const item = await itemRepo.findOne({ where: { tenantId, wishlistId: fromWishlistId, wishlistItemId } })
    if (!item) throw new Error(PAYMENT_WISHLIST_MESSAGES.WISHLIST_ITEM_NOT_FOUND)

    item.wishlistId = toWishlistId
    await itemRepo.save(item)
    await redis.del(PaymentWishlistService.cacheKey(fromWishlistId))
    await redis.del(PaymentWishlistService.cacheKey(toWishlistId))
    return PaymentWishlistService.buildWithItems(tenantId, toWishlistId)
  }

  static async clear(tenantId: string, wishlistId: string): Promise<WishlistWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const wishlistRepo = ds.getRepository(WishlistEntity)
    const wishlist = await wishlistRepo.findOne({ where: { tenantId, wishlistId } })
    if (!wishlist) throw new Error(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND)

    await ds.getRepository(WishlistItemEntity).delete({ tenantId, wishlistId })
    await redis.del(PaymentWishlistService.cacheKey(wishlistId))
    return PaymentWishlistService.buildWithItems(tenantId, wishlistId)
  }
}
