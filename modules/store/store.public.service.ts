import 'reflect-metadata'
import { ILike, In } from 'typeorm'
import { tenantDataSourceFor } from '@/modules/db'
import { StoreProduct as ProductEntity } from './entities/store_product.entity'
import { StoreProductImage as ImageEntity } from './entities/store_product_image.entity'
import { StoreCategory as CategoryEntity } from './entities/store_category.entity'
import {
  StoreProductSchema, StoreProductImageSchema, StoreCategorySchema,
  type StoreProduct,
} from './store.types'
import StorePricingService, { type ResolvedPrice } from './store.pricing.service'
import { STORE_MESSAGES } from './store.messages'
import { AppError, ErrorCode } from '@/modules/common/app-error'

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

  /** Public product detail page by slug (ACTIVE + country-available only). */
  static async getProductBySlug(tenantId: string, slug: string, opts: StorefrontOpts = {}): Promise<StorefrontView> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(ProductEntity).findOne({ where: { tenantId, slug, status: 'ACTIVE' } })
    if (!row) throw new AppError(STORE_MESSAGES.PRODUCT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const product = StoreProductSchema.parse(row)
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

  /** Public, localized category tree (active categories only). */
  static async listCategories(tenantId: string, opts: StorefrontOpts = {}): Promise<Array<{ categoryId: string; parentId: string | null; slug: string; name: string; description: string | null }>> {
    const ds = await tenantDataSourceFor(tenantId)
    const rows = await ds.getRepository(CategoryEntity).find({ where: { tenantId, isActive: true }, order: { sortOrder: 'ASC' } })
    return rows.map((r) => {
      const c = StoreCategorySchema.parse(r)
      const localized = StorePricingService.localizeCategory(c, opts.locale)
      return { categoryId: c.categoryId, parentId: c.parentId, slug: c.slug, name: localized.name, description: localized.description }
    })
  }
}
