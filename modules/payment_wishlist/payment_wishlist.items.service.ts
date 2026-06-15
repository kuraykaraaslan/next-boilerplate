import 'reflect-metadata'
import { IsNull } from 'typeorm'
import { tenantDataSourceFor } from '@/modules/db'
import Logger from '@/modules/logger'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { Wishlist as WishlistEntity } from './entities/wishlist.entity'
import { WishlistItem as WishlistItemEntity } from './entities/wishlist_item.entity'
import type { WishlistWithItems } from './payment_wishlist.types'
import type { AddWishlistItemDTO } from './payment_wishlist.dto'
import { PAYMENT_WISHLIST_MESSAGES } from './payment_wishlist.messages'
import { buildWithItems } from './payment_wishlist.crud.service'

export async function addItem(tenantId: string, wishlistId: string, dto: AddWishlistItemDTO): Promise<WishlistWithItems> {
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

  return buildWithItems(tenantId, wishlistId)
}

export async function removeItem(tenantId: string, wishlistId: string, wishlistItemId: string): Promise<WishlistWithItems> {
  const ds = await tenantDataSourceFor(tenantId)
  const itemRepo = ds.getRepository(WishlistItemEntity)
  const item = await itemRepo.findOne({ where: { tenantId, wishlistId, wishlistItemId } })
  if (!item) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
  await itemRepo.remove(item)
  return buildWithItems(tenantId, wishlistId)
}

export async function moveItem(
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
  return buildWithItems(tenantId, toWishlistId)
}

export async function clear(tenantId: string, wishlistId: string): Promise<WishlistWithItems> {
  const ds = await tenantDataSourceFor(tenantId)
  const wishlistRepo = ds.getRepository(WishlistEntity)
  const wishlist = await wishlistRepo.findOne({ where: { tenantId, wishlistId } })
  if (!wishlist) throw new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

  await ds.getRepository(WishlistItemEntity).delete({ tenantId, wishlistId })
  return buildWithItems(tenantId, wishlistId)
}
