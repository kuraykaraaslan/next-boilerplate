import 'reflect-metadata'
import type { SafeWishlist, WishlistWithItems } from './payment_wishlist.types'
import type {
  CreateWishlistDTO, UpdateWishlistDTO, AddWishlistItemDTO, GetWishlistsQuery,
} from './payment_wishlist.dto'
import {
  getOrCreateDefault, create, getById, getByShareToken, update, list, remove,
} from './payment_wishlist.crud.service'
import { addItem, removeItem, moveItem, clear } from './payment_wishlist.items.service'
import { addAllToCart, markAddedToCart, conversionStats } from './payment_wishlist.cart.service'
import { exportForUser, eraseForUser } from './payment_wishlist.gdpr.service'

/**
 * Wishlist service facade. The implementation is split across focused modules
 * (`payment_wishlist.crud.service` wishlist CRUD, `payment_wishlist.items.service`
 * item add/remove/move/clear, `payment_wishlist.cart.service` cart conversion,
 * `payment_wishlist.gdpr.service` export/erasure); this class preserves the single
 * `PaymentWishlistService.*` entry point its callers depend on.
 */
export default class PaymentWishlistService {
  static getOrCreateDefault(tenantId: string, userId: string): Promise<WishlistWithItems> {
    return getOrCreateDefault(tenantId, userId)
  }

  static create(tenantId: string, dto: CreateWishlistDTO): Promise<SafeWishlist> {
    return create(tenantId, dto)
  }

  static getById(tenantId: string, wishlistId: string): Promise<WishlistWithItems> {
    return getById(tenantId, wishlistId)
  }

  static getByShareToken(tenantId: string, shareToken: string): Promise<WishlistWithItems> {
    return getByShareToken(tenantId, shareToken)
  }

  static update(tenantId: string, wishlistId: string, dto: UpdateWishlistDTO): Promise<SafeWishlist> {
    return update(tenantId, wishlistId, dto)
  }

  static list(tenantId: string, query: GetWishlistsQuery): Promise<{ data: SafeWishlist[]; total: number }> {
    return list(tenantId, query)
  }

  static delete(tenantId: string, wishlistId: string): Promise<void> {
    return remove(tenantId, wishlistId)
  }

  static addItem(tenantId: string, wishlistId: string, dto: AddWishlistItemDTO): Promise<WishlistWithItems> {
    return addItem(tenantId, wishlistId, dto)
  }

  static removeItem(tenantId: string, wishlistId: string, wishlistItemId: string): Promise<WishlistWithItems> {
    return removeItem(tenantId, wishlistId, wishlistItemId)
  }

  static moveItem(tenantId: string, fromWishlistId: string, toWishlistId: string, wishlistItemId: string): Promise<WishlistWithItems> {
    return moveItem(tenantId, fromWishlistId, toWishlistId, wishlistItemId)
  }

  static clear(tenantId: string, wishlistId: string): Promise<WishlistWithItems> {
    return clear(tenantId, wishlistId)
  }

  static addAllToCart(
    tenantId: string, wishlistId: string, opts: { userId?: string; guestToken?: string; currency?: string },
  ): Promise<{ added: number; skipped: number }> {
    return addAllToCart(tenantId, wishlistId, opts)
  }

  static markAddedToCart(tenantId: string, wishlistItemId: string): Promise<void> {
    return markAddedToCart(tenantId, wishlistItemId)
  }

  static conversionStats(tenantId: string, wishlistId?: string): Promise<{ total: number; converted: number; rate: number }> {
    return conversionStats(tenantId, wishlistId)
  }

  static exportForUser(tenantId: string, userId: string): Promise<unknown> {
    return exportForUser(tenantId, userId)
  }

  static eraseForUser(tenantId: string, userId: string): Promise<{ wishlists: number; items: number }> {
    return eraseForUser(tenantId, userId)
  }
}
