import 'reflect-metadata'
import { ILike, Not } from 'typeorm'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight } from '@/modules/redis'
import Logger from '@/modules/logger'
import WebhookService from '@/modules/webhook/webhook.service'
import SettingService from '@/modules/setting/setting.service'
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service'
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys'
import { isRootTenant } from '@/modules/tenant/tenant.constants'
import { isCurrencyCode } from '@/modules/common'
import { StoreProduct as ProductEntity } from './entities/store_product.entity'
import { StoreProductImage as ImageEntity } from './entities/store_product_image.entity'
import { StoreProductSpecValue as SpecValueEntity } from './entities/store_product_spec_value.entity'
import {
  StoreProductSchema, StoreProductDetailSchema, StoreProductImageSchema, StoreProductSpecValueSchema,
  type StoreProduct, type StoreProductDetail,
} from './store.types'
import type { CreateProductDTO, UpdateProductDTO, GetProductsQuery } from './store.dto'
import { STORE_MESSAGES } from './store.messages'
import { AppError, ErrorCode } from '@/modules/common/app-error'

export default class StoreProductCrudService {

  /**
   * Plan-tier catalog limit. Only enforced when the tenant's plan actually
   * declares a `max_products` LIMIT feature — tenants without the feature
   * configured (or the root tenant) are unrestricted, so this never breaks
   * existing catalogs.
   */
  private static async assertCatalogLimit(tenantId: string, currentCount: number): Promise<void> {
    if (isRootTenant(tenantId)) return
    const result = await TenantFeatureGateService.checkFeatureAccess(tenantId, FEATURE_KEYS.MAX_PRODUCTS, currentCount)
      .catch(() => null)
    if (result && !result.allowed && result.type === 'LIMIT') {
      throw new AppError(STORE_MESSAGES.CATALOG_LIMIT_REACHED, 403, ErrorCode.FEATURE_NOT_AVAILABLE)
    }
  }

  /** Reject a SKU already used by another product in the same tenant. */
  private static async assertSkuUnique(tenantId: string, sku: string | undefined, exceptProductId?: string): Promise<void> {
    if (!sku) return
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId, sku }
    if (exceptProductId) where.productId = Not(exceptProductId)
    const clash = await ds.getRepository(ProductEntity).findOne({ where })
    if (clash) throw new AppError(STORE_MESSAGES.PRODUCT_SKU_TAKEN, 409, ErrorCode.CONFLICT)
  }

  static async createProduct(tenantId: string, data: CreateProductDTO): Promise<StoreProduct> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductEntity)
    const taken = await repo.findOne({ where: { tenantId, slug: data.slug } })
    if (taken) throw new AppError(STORE_MESSAGES.PRODUCT_SLUG_TAKEN, 409, ErrorCode.CONFLICT)
    await this.assertSkuUnique(tenantId, data.sku)

    // Plan-tier catalog limit.
    const count = await repo.count({ where: { tenantId } })
    await this.assertCatalogLimit(tenantId, count)

    // Tenant-configurable default currency: when the caller didn't override the
    // currency, fall back to the tenant's storeDefaultCurrency setting.
    const payload: CreateProductDTO = { ...data }
    if (!data.currency || data.currency === 'USD') {
      const s = await SettingService.getByKeys(tenantId, ['storeDefaultCurrency']).catch(() => ({} as Record<string, string>))
      if (s.storeDefaultCurrency && isCurrencyCode(s.storeDefaultCurrency) && !data.priceList && data.currency === 'USD') {
        payload.currency = s.storeDefaultCurrency
      }
    }

    // Approval workflow: when the tenant requires review, force new products
    // into PENDING_REVIEW rather than letting them be created ACTIVE directly.
    const approvalRequired = await this.isApprovalRequired(tenantId)
    if (approvalRequired && (payload.status === 'ACTIVE' || payload.status === 'APPROVED')) {
      payload.status = 'PENDING_REVIEW'
    }

    try {
      const saved = await repo.save(repo.create({ tenantId, ...payload }))
      await WebhookService.dispatchEvent(tenantId, 'product.created', {
        productId: saved.productId, slug: saved.slug, name: saved.name, status: saved.status,
      }).catch((err) => Logger.warn(`product.created webhook failed: ${err?.message ?? err}`))
      return StoreProductSchema.parse(saved)
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${STORE_MESSAGES.PRODUCT_CREATE_FAILED}: ${error}`)
      throw new AppError(STORE_MESSAGES.PRODUCT_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  /** Whether the tenant enforces an editorial review step before publishing. */
  private static async isApprovalRequired(tenantId: string): Promise<boolean> {
    const s = await SettingService.getByKeys(tenantId, ['productApprovalRequired']).catch(() => ({} as Record<string, string>))
    return s.productApprovalRequired === 'true'
  }

  static async updateProduct(tenantId: string, productId: string, data: UpdateProductDTO): Promise<StoreProduct> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductEntity)
    const product = await repo.findOne({ where: { tenantId, productId } })
    if (!product) throw new AppError(STORE_MESSAGES.PRODUCT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (data.slug && data.slug !== product.slug) {
      const taken = await repo.findOne({ where: { tenantId, slug: data.slug } })
      if (taken) throw new AppError(STORE_MESSAGES.PRODUCT_SLUG_TAKEN, 409, ErrorCode.CONFLICT)
    }
    if (data.sku && data.sku !== product.sku) {
      await this.assertSkuUnique(tenantId, data.sku, productId)
    }
    // Block direct DRAFT/PENDING → ACTIVE jumps when approval is required.
    if (data.status === 'ACTIVE' && product.status !== 'APPROVED') {
      if (await this.isApprovalRequired(tenantId)) {
        throw new AppError(STORE_MESSAGES.PRODUCT_APPROVAL_REQUIRED, 422, ErrorCode.VALIDATION_ERROR)
      }
    }
    Object.assign(product, data)
    const saved = await repo.save(product)
    await redis.del(`store:product:${productId}`).catch(() => {})
    await WebhookService.dispatchEvent(tenantId, 'product.updated', {
      productId: saved.productId, slug: saved.slug, name: saved.name, status: saved.status,
    }).catch((err) => Logger.warn(`product.updated webhook failed: ${err?.message ?? err}`))
    return StoreProductSchema.parse(saved)
  }

  static async getProduct(tenantId: string, productId: string): Promise<StoreProduct> {
    return singleFlight(`store:product:${productId}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const product = await ds.getRepository(ProductEntity).findOne({ where: { tenantId, productId } })
      if (!product) throw new AppError(STORE_MESSAGES.PRODUCT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
      return StoreProductSchema.parse(product)
    })
  }

  static async getProductDetail(tenantId: string, productId: string): Promise<StoreProductDetail> {
    return singleFlight(`store:product:detail:${productId}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const product = await ds.getRepository(ProductEntity).findOne({ where: { tenantId, productId } })
      if (!product) throw new AppError(STORE_MESSAGES.PRODUCT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
      const [images, specValues] = await Promise.all([
        ds.getRepository(ImageEntity).find({ where: { tenantId, productId }, order: { isPrimary: 'DESC', sortOrder: 'ASC' } }),
        ds.getRepository(SpecValueEntity).find({ where: { tenantId, productId } }),
      ])
      return StoreProductDetailSchema.parse({
        ...product,
        images: images.map((i) => StoreProductImageSchema.parse(i)),
        specValues: specValues.map((s) => StoreProductSpecValueSchema.parse(s)),
      })
    })
  }

  static async listProducts(tenantId: string, query: GetProductsQuery): Promise<{ data: StoreProduct[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductEntity)
    const hasSpecFilters = !!query.specFilters && query.specFilters.length > 0
    if (!hasSpecFilters) {
      const where: Record<string, unknown> = { tenantId }
      if (query.categoryId) where['categoryId'] = query.categoryId
      if (query.status) where['status'] = query.status
      if (query.isFeatured !== undefined) where['isFeatured'] = query.isFeatured
      if (query.search) where['name'] = ILike(`%${query.search}%`)
      const [rows, total] = await repo.findAndCount({
        where, order: { sortOrder: 'ASC', createdAt: 'DESC' },
        skip: query.page * query.pageSize, take: query.pageSize,
      })
      return { data: rows.map((r) => StoreProductSchema.parse(r)), total }
    }
    const qb = repo.createQueryBuilder('p')
      .where('p."tenantId" = :tenantId', { tenantId }).andWhere('p."deletedAt" IS NULL')
    if (query.categoryId) qb.andWhere('p."categoryId" = :categoryId', { categoryId: query.categoryId })
    if (query.status) qb.andWhere('p."status" = :status', { status: query.status })
    if (query.isFeatured !== undefined) qb.andWhere('p."isFeatured" = :isFeatured', { isFeatured: query.isFeatured })
    if (query.search) qb.andWhere('p."name" ILIKE :search', { search: `%${query.search}%` })
    for (const [i, f] of (query.specFilters ?? []).entries()) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM store_product_spec_values sv WHERE sv."productId" = p."productId" AND sv."tenantId" = :tenantId AND sv."specId" = :sf${i}_id AND sv."value" = ANY(:sf${i}_vals))`,
        { [`sf${i}_id`]: f.specId, [`sf${i}_vals`]: f.values },
      )
    }
    qb.orderBy('p."sortOrder"', 'ASC').addOrderBy('p."createdAt"', 'DESC')
      .skip(query.page * query.pageSize).take(query.pageSize)
    const [rows, total] = await qb.getManyAndCount()
    return { data: rows.map((r) => StoreProductSchema.parse(r)), total }
  }

  static async deleteProduct(tenantId: string, productId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const product = await ds.getRepository(ProductEntity).findOne({ where: { tenantId, productId } })
    if (!product) throw new AppError(STORE_MESSAGES.PRODUCT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await ds.getRepository(ProductEntity).softDelete({ tenantId, productId })
    await redis.del(`store:product:${productId}`).catch(() => {})
    await redis.del(`store:product:detail:${productId}`).catch(() => {})
    await WebhookService.dispatchEvent(tenantId, 'product.deleted', {
      productId, slug: product.slug, name: product.name,
    }).catch((err) => Logger.warn(`product.deleted webhook failed: ${err?.message ?? err}`))
  }

  // ── Approval workflow ──────────────────────────────────────────────────────

  private static async transition(tenantId: string, productId: string, status: StoreProduct['status']): Promise<StoreProduct> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductEntity)
    const product = await repo.findOne({ where: { tenantId, productId } })
    if (!product) throw new AppError(STORE_MESSAGES.PRODUCT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    product.status = status
    const saved = await repo.save(product)
    await redis.del(`store:product:${productId}`).catch(() => {})
    await WebhookService.dispatchEvent(tenantId, 'product.updated', {
      productId: saved.productId, slug: saved.slug, name: saved.name, status: saved.status,
    }).catch((err) => Logger.warn(`product.updated webhook failed: ${err?.message ?? err}`))
    return StoreProductSchema.parse(saved)
  }

  /** Submit a DRAFT product for editorial review. */
  static submitForReview(tenantId: string, productId: string): Promise<StoreProduct> {
    return this.transition(tenantId, productId, 'PENDING_REVIEW')
  }

  /** Approve a product in review (does not publish — caller activates). */
  static approve(tenantId: string, productId: string): Promise<StoreProduct> {
    return this.transition(tenantId, productId, 'APPROVED')
  }

  /** Reject a product in review, returning it to DRAFT. */
  static reject(tenantId: string, productId: string): Promise<StoreProduct> {
    return this.transition(tenantId, productId, 'DRAFT')
  }

  /** Bulk status update across many products in one tenant. */
  static async bulkSetStatus(tenantId: string, productIds: string[], status: StoreProduct['status']): Promise<number> {
    if (productIds.length === 0) return 0
    const ds = await tenantDataSourceFor(tenantId)
    const result = await ds.getRepository(ProductEntity)
      .createQueryBuilder()
      .update(ProductEntity).set({ status })
      .where('"tenantId" = :tenantId AND "productId" IN (:...ids)', { tenantId, ids: productIds })
      .execute()
    for (const id of productIds) await redis.del(`store:product:${id}`).catch(() => {})
    return result.affected ?? 0
  }
}
