import 'reflect-metadata'
import { ILike, In } from 'typeorm'
import { tenantDataSourceFor } from '@nb/db'
import redis, { singleFlight } from '@nb/redis'
import Logger from '@nb/logger'
import { StoreBundle as BundleEntity } from './entities/store_bundle.entity'
import { StoreBundleItem as BundleItemEntity } from './entities/store_bundle_item.entity'
import { StoreProduct as ProductEntity } from './entities/store_product.entity'
import {
  StoreBundleSchema, StoreBundleItemSchema, StoreBundleWithItemsSchema,
  type StoreBundle, type StoreBundleItem, type StoreBundleWithItems,
} from './store.types'
import type {
  CreateBundleDTO, UpdateBundleDTO, AddBundleItemDTO, UpdateBundleItemDTO, GetBundlesQuery,
} from './store.dto'
import { STORE_MESSAGES } from './store.messages'
import SettingService from '@nb/setting/server/setting.service'
import { isCurrencyCode } from '@nb/common'
import { AppError, ErrorCode } from '@nb/common/server/app-error'

/** Store bundle + bundle-item CRUD (split out of `StoreService`). */
export default class StoreBundleService {
  // ============================================================================
  // Bundles
  // ============================================================================

  static async createBundle(tenantId: string, data: CreateBundleDTO): Promise<StoreBundle> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(BundleEntity)
    const taken = await repo.findOne({ where: { tenantId, slug: data.slug } })
    if (taken) throw new AppError(STORE_MESSAGES.BUNDLE_SLUG_TAKEN, 409, ErrorCode.CONFLICT)
    try {
      const payload: CreateBundleDTO = { ...data }
      // Tenant-configurable default currency when caller left the USD default.
      if (data.currency === 'USD') {
        const s = await SettingService.getByKeys(tenantId, ['storeDefaultCurrency']).catch(() => ({} as Record<string, string>))
        if (s.storeDefaultCurrency && isCurrencyCode(s.storeDefaultCurrency)) payload.currency = s.storeDefaultCurrency
      }
      const bundle = repo.create({ tenantId, ...payload })
      const saved = await repo.save(bundle)
      return StoreBundleSchema.parse(saved)
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${STORE_MESSAGES.BUNDLE_CREATE_FAILED}: ${error}`)
      throw new AppError(STORE_MESSAGES.BUNDLE_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async updateBundle(tenantId: string, bundleId: string, data: UpdateBundleDTO): Promise<StoreBundle> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(BundleEntity)
    const bundle = await repo.findOne({ where: { tenantId, bundleId } })
    if (!bundle) throw new AppError(STORE_MESSAGES.BUNDLE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (data.slug && data.slug !== bundle.slug) {
      const taken = await repo.findOne({ where: { tenantId, slug: data.slug } })
      if (taken) throw new AppError(STORE_MESSAGES.BUNDLE_SLUG_TAKEN, 409, ErrorCode.CONFLICT)
    }
    Object.assign(bundle, data)
    const saved = await repo.save(bundle)
    await redis.del(`store:bundle:${bundleId}`).catch(() => {})
    return StoreBundleSchema.parse(saved)
  }

  static async getBundle(tenantId: string, bundleId: string, withItems = false): Promise<StoreBundle | StoreBundleWithItems> {
    return singleFlight(`store:bundle:${bundleId}:${withItems}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const bundle = await ds.getRepository(BundleEntity).findOne({ where: { tenantId, bundleId } })
      if (!bundle) throw new AppError(STORE_MESSAGES.BUNDLE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
      if (!withItems) return StoreBundleSchema.parse(bundle)
      const items = await ds.getRepository(BundleItemEntity).find({
        where: { tenantId, bundleId }, order: { sortOrder: 'ASC' },
      })
      // Enrich each item with its product's name + base price so the UI can
      // display them regardless of the product's status (ACTIVE/DRAFT/etc).
      const productIds = [...new Set(items.map((i) => i.productId))]
      const products = productIds.length
        ? await ds.getRepository(ProductEntity).find({ where: { tenantId, productId: In(productIds) } })
        : []
      const productById = new Map(products.map((p) => [p.productId, p]))
      const enriched = items.map((i) => {
        const p = productById.get(i.productId)
        return {
          ...i,
          productName: p?.name ?? null,
          productBasePrice: p?.basePrice ?? null,
          productCurrency: p?.currency ?? null,
        }
      })
      return StoreBundleWithItemsSchema.parse({ ...bundle, items: enriched })
    })
  }

  static async listBundles(
    tenantId: string, query: GetBundlesQuery,
  ): Promise<{ data: StoreBundle[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.status) where['status'] = query.status
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [rows, total] = await ds.getRepository(BundleEntity).findAndCount({
      where, order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: query.page * query.pageSize, take: query.pageSize,
    })
    return { data: rows.map((r) => StoreBundleSchema.parse(r)), total }
  }

  static async addBundleItem(tenantId: string, bundleId: string, data: AddBundleItemDTO): Promise<StoreBundleItem> {
    const ds = await tenantDataSourceFor(tenantId)
    const bundle = await ds.getRepository(BundleEntity).findOne({ where: { tenantId, bundleId } })
    if (!bundle) throw new AppError(STORE_MESSAGES.BUNDLE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const product = await ds.getRepository(ProductEntity).findOne({ where: { tenantId, productId: data.productId } })
    if (!product) throw new AppError(STORE_MESSAGES.PRODUCT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const item = ds.getRepository(BundleItemEntity).create({ tenantId, bundleId, ...data })
    const saved = await ds.getRepository(BundleItemEntity).save(item)
    await redis.del(`store:bundle:${bundleId}:true`).catch(() => {})
    return StoreBundleItemSchema.parse(saved)
  }

  static async updateBundleItem(
    tenantId: string, bundleId: string, bundleItemId: string, data: UpdateBundleItemDTO,
  ): Promise<StoreBundleItem> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(BundleItemEntity)
    const item = await repo.findOne({ where: { tenantId, bundleId, bundleItemId } })
    if (!item) throw new AppError(STORE_MESSAGES.BUNDLE_ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (data.quantity !== undefined) item.quantity = data.quantity
    if (data.overridePrice !== undefined) item.overridePrice = data.overridePrice ?? undefined
    if (data.sortOrder !== undefined) item.sortOrder = data.sortOrder
    const saved = await repo.save(item)
    await redis.del(`store:bundle:${bundleId}:true`).catch(() => {})
    return StoreBundleItemSchema.parse(saved)
  }

  static async removeBundleItem(tenantId: string, bundleId: string, bundleItemId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    await ds.getRepository(BundleItemEntity).delete({ tenantId, bundleId, bundleItemId })
    await redis.del(`store:bundle:${bundleId}:true`).catch(() => {})
  }

  static async deleteBundle(tenantId: string, bundleId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const bundle = await ds.getRepository(BundleEntity).findOne({ where: { tenantId, bundleId } })
    if (!bundle) throw new AppError(STORE_MESSAGES.BUNDLE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await ds.getRepository(BundleEntity).softDelete({ tenantId, bundleId })
    await redis.del(`store:bundle:${bundleId}:true`).catch(() => {})
    await redis.del(`store:bundle:${bundleId}:false`).catch(() => {})
  }
}
