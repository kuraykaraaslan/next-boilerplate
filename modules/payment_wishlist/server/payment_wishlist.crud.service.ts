import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import { singleFlight } from '@kuraykaraaslan/redis'
import Logger from '@kuraykaraaslan/logger'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'
import { Wishlist as WishlistEntity } from './entities/wishlist.entity'
import { WishlistItem as WishlistItemEntity } from './entities/wishlist_item.entity'
import {
  SafeWishlistSchema, WishlistWithItemsSchema,
  type SafeWishlist, type WishlistWithItems,
} from './payment_wishlist.types'
import type { CreateWishlistDTO, UpdateWishlistDTO, GetWishlistsQuery } from './payment_wishlist.dto'
import { PAYMENT_WISHLIST_MESSAGES } from './payment_wishlist.messages'

export async function buildWithItems(tenantId: string, wishlistId: string): Promise<WishlistWithItems> {
  const ds = await tenantDataSourceFor(tenantId)
  const wishlist = await ds.getRepository(WishlistEntity).findOne({ where: { tenantId, wishlistId } })
  if (!wishlist) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
  const items = await ds.getRepository(WishlistItemEntity).find({
    where: { tenantId, wishlistId },
    order: { createdAt: 'DESC' },
  })
  return WishlistWithItemsSchema.parse({ ...wishlist, items, itemCount: items.length })
}

export async function getOrCreateDefault(tenantId: string, userId: string): Promise<WishlistWithItems> {
  const ds = await tenantDataSourceFor(tenantId)
  const repo = ds.getRepository(WishlistEntity)
  let wishlist = await repo.findOne({ where: { tenantId, userId, name: 'Default' } })
  if (!wishlist) {
    wishlist = await repo.save(repo.create({ tenantId, userId, name: 'Default', isPublic: false }))
  }
  return buildWithItems(tenantId, wishlist.wishlistId)
}

export async function create(tenantId: string, dto: CreateWishlistDTO): Promise<SafeWishlist> {
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

export async function getById(tenantId: string, wishlistId: string): Promise<WishlistWithItems> {
  return singleFlight(`wishlist:${wishlistId}`, async () => {
    return buildWithItems(tenantId, wishlistId)
  })
}

export async function getByShareToken(tenantId: string, shareToken: string): Promise<WishlistWithItems> {
  const ds = await tenantDataSourceFor(tenantId)
  const wishlist = await ds.getRepository(WishlistEntity).findOne({ where: { tenantId, shareToken } })
  if (!wishlist) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
  if (!wishlist.isPublic) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_PUBLIC, 403, ErrorCode.FORBIDDEN)
  return buildWithItems(tenantId, wishlist.wishlistId)
}

export async function update(tenantId: string, wishlistId: string, dto: UpdateWishlistDTO): Promise<SafeWishlist> {
  const ds = await tenantDataSourceFor(tenantId)
  const repo = ds.getRepository(WishlistEntity)
  const wishlist = await repo.findOne({ where: { tenantId, wishlistId } })
  if (!wishlist) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

  Object.assign(wishlist, dto)
  if (wishlist.isPublic && !wishlist.shareToken) wishlist.shareToken = randomUUID()

  const saved = await repo.save(wishlist)
  return SafeWishlistSchema.parse(saved)
}

export async function list(tenantId: string, query: GetWishlistsQuery): Promise<{ data: SafeWishlist[]; total: number }> {
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

export async function remove(tenantId: string, wishlistId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId)
  const repo = ds.getRepository(WishlistEntity)
  const wishlist = await repo.findOne({ where: { tenantId, wishlistId } })
  if (!wishlist) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
  await repo.softRemove(wishlist)
}
