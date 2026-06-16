import 'reflect-metadata'
import { ILike, In } from 'typeorm'
import { tenantDataSourceFor } from '@nb/db'
import redis, { jitter, singleFlight } from '@nb/redis'
import { env } from '@nb/env'
import { StoreProduct as ProductEntity } from './entities/store_product.entity'
import { StoreProductImage as ImageEntity } from './entities/store_product_image.entity'
import { StoreCategory as CategoryEntity } from './entities/store_category.entity'
import {
  StoreProductSchema, StoreProductImageSchema, StoreCategorySchema,
  type StoreProduct, type StoreCategory,
} from './store.types'
import StorePricingService, { type ResolvedPrice } from './store.pricing.service'
import { STORE_MESSAGES } from './store.messages'
import { AppError, ErrorCode } from '@nb/common/server/app-error'

// Storefront detail/category reads are the highest-traffic paths in the catalog.
// We cache the *raw* (un-localized, un-priced) ACTIVE rows — locale/currency/
// country projection still runs per-request, so a single cache entry serves every
// buyer variant. Product-by-slug is invalidated from the product CRUD write/status
// paths; the active-category list is invalidated from category writes.
const PUBLIC_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5)

function publicProductKey(tenantId: string, slug: string): string {
  return `store:public:product:${tenantId}:${slug}`
}

function publicCategoriesKey(tenantId: string): string {
  return `store:public:cats:${tenantId}`
}

/** Evict a cached storefront product (call on product write / status change). */
export async function invalidatePublicProduct(tenantId: string, slug: string): Promise<void> {
  await redis.del(publicProductKey(tenantId, slug)).catch(() => {})
}

/** Evict the cached storefront category list (call on category write). */
export async function invalidatePublicCategories(tenantId: string): Promise<void> {
  await redis.del(publicCategoriesKey(tenantId)).catch(() => {})
}

export interface StorefrontView {
  productId: string
  slug: string
  name: string
  shortDescription: string | null
  details: string | null
  categoryId: string
  isFeatured: boolean
  fulfillmentType: string
  price: ResolvedPrice
  images: Array<{ url: string; altText: string | null; isPrimary: boolean }>
  inStock: boolean
}

export interface StorefrontOpts {
  locale?: string
  currency?: string
  country?: string
}

/**
 * Customer-facing storefront read API. Unlike the admin services this only ever
 * exposes ACTIVE products, applies locale/currency/country resolution via
 * StorePricingService, and filters out products not available in the buyer's
 * country. No mock — real catalog data, localized and priced for the request.
 */
export default class StorePublicService {

  private static project(product: StoreProduct, opts: StorefrontOpts, images: Array<{ url: string; altText: string | null; isPrimary: boolean }>): StorefrontView {
    const localized = StorePricingService.localizeProduct(product, opts.locale)
    return {
      productId: product.productId,
      slug: product.slug,
      name: localized.name,
      shortDescription: localized.shortDescription,
      details: localized.details,
      categoryId: product.categoryId,
      isFeatured: product.isFeatured,
      fulfillmentType: product.fulfillmentType,
      price: StorePricingService.resolvePrice(product, { country: opts.country, currency: opts.currency }),
      images,
      inStock: product.fulfillmentType === 'DIGITAL_UNLIMITED' || StorePricingService.totalStock(product) > 0 || product.allowBackorder,
    }
  }

  /** Paginated public product listing (ACTIVE + country-available only). */
  static async listProducts(
    tenantId: string,
    query: { page?: number; pageSize?: number; categoryId?: string; search?: string; isFeatured?: boolean },
    opts: StorefrontOpts = {},
  ): Promise<{ data: StorefrontView[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductEntity)
    const page = query.page ?? 0
    const pageSize = Math.min(query.pageSize ?? 20, 100)

    const where: Record<string, unknown> = { tenantId, status: 'ACTIVE' }
    if (query.categoryId) where.categoryId = query.categoryId
    if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured
    if (query.search) where.name = ILike(`%${query.search}%`)

    const [rows, total] = await repo.findAndCount({
      where, order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: page * pageSize, take: pageSize,
    })

    // Country availability filter (post-query — availability is JSONB).
    const available = rows.map((r) => StoreProductSchema.parse(r)).filter((p) => StorePricingService.isAvailableIn(p, opts.country))

    // Batch-load primary images for the page.
    const ids = available.map((p) => p.productId)
    const images = ids.length > 0
      ? await ds.getRepository(ImageEntity).find({ where: { tenantId, productId: In(ids) }, order: { isPrimary: 'DESC', sortOrder: 'ASC' } })
      : []
    const byProduct = new Map<string, Array<{ url: string; altText: string | null; isPrimary: boolean }>>()
    for (const img of images) {
      const parsed = StoreProductImageSchema.parse(img)
      const list = byProduct.get(parsed.productId) ?? []
      list.push({ url: parsed.url, altText: parsed.altText, isPrimary: parsed.isPrimary })
      byProduct.set(parsed.productId, list)
    }

    return {
      data: available.map((p) => this.project(p, opts, byProduct.get(p.productId) ?? [])),
      total,
    }
  }

  /** Read-through cache of the raw ACTIVE product row by slug (locale/price agnostic). */
  private static async getActiveProductBySlug(tenantId: string, slug: string): Promise<StoreProduct> {
    const key = publicProductKey(tenantId, slug)
    const cached = await redis.get(key).catch(() => null)
    if (cached) {
      try { return StoreProductSchema.parse(JSON.parse(cached)) } catch { await redis.del(key).catch(() => {}) }
    }
    return singleFlight(key, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const row = await ds.getRepository(ProductEntity).findOne({ where: { tenantId, slug, status: 'ACTIVE' } })
      if (!row) throw new AppError(STORE_MESSAGES.PRODUCT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
      const parsed = StoreProductSchema.parse(row)
      await redis.setex(key, jitter(PUBLIC_CACHE_TTL), JSON.stringify(parsed)).catch(() => {})
      return parsed
    })
  }

  /** Public product detail page by slug (ACTIVE + country-available only). */
  static async getProductBySlug(tenantId: string, slug: string, opts: StorefrontOpts = {}): Promise<StorefrontView> {
    const ds = await tenantDataSourceFor(tenantId)
    const product = await this.getActiveProductBySlug(tenantId, slug)
    if (!StorePricingService.isAvailableIn(product, opts.country)) {
      throw new AppError(STORE_MESSAGES.PRODUCT_NOT_AVAILABLE_IN_COUNTRY, 403, ErrorCode.FORBIDDEN)
    }
    const images = await ds.getRepository(ImageEntity).find({
      where: { tenantId, productId: product.productId }, order: { isPrimary: 'DESC', sortOrder: 'ASC' },
    })
    return this.project(product, opts, images.map((i) => {
      const p = StoreProductImageSchema.parse(i); return { url: p.url, altText: p.altText, isPrimary: p.isPrimary }
    }))
  }

  /** Read-through cache of the raw ACTIVE category list (locale agnostic). */
  private static async getActiveCategories(tenantId: string): Promise<StoreCategory[]> {
    const key = publicCategoriesKey(tenantId)
    const cached = await redis.get(key).catch(() => null)
    if (cached) {
      try { return (JSON.parse(cached) as unknown[]).map((c) => StoreCategorySchema.parse(c)) } catch { await redis.del(key).catch(() => {}) }
    }
    return singleFlight(key, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const rows = await ds.getRepository(CategoryEntity).find({ where: { tenantId, isActive: true }, order: { sortOrder: 'ASC' } })
      const parsed = rows.map((r) => StoreCategorySchema.parse(r))
      await redis.setex(key, jitter(PUBLIC_CACHE_TTL), JSON.stringify(parsed)).catch(() => {})
      return parsed
    })
  }

  /** Public, localized category tree (active categories only). */
  static async listCategories(tenantId: string, opts: StorefrontOpts = {}): Promise<Array<{ categoryId: string; parentId: string | null; slug: string; name: string; description: string | null }>> {
    const cats = await this.getActiveCategories(tenantId)
    return cats.map((c) => {
      const localized = StorePricingService.localizeCategory(c, opts.locale)
      return { categoryId: c.categoryId, parentId: c.parentId, slug: c.slug, name: localized.name, description: localized.description }
    })
  }
}
