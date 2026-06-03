import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight } from '@/modules/redis'
import Logger from '@/modules/logger'
import WebhookService from '@/modules/webhook/webhook.service'
import { StoreProduct as ProductEntity } from './entities/store_product.entity'
import { StoreProductImage as ImageEntity } from './entities/store_product_image.entity'
import { StoreProductSpecValue as SpecValueEntity } from './entities/store_product_spec_value.entity'
import {
  StoreProductSchema, StoreProductImageSchema, StoreProductSpecValueSchema, StoreProductDetailSchema,
  type StoreProduct, type StoreProductImage, type StoreProductSpecValue, type StoreProductDetail,
} from './store.types'
import type {
  CreateProductDTO, UpdateProductDTO, GetProductsQuery, AddProductImageDTO, SetSpecValuesDTO,
} from './store.dto'
import { STORE_MESSAGES } from './store.messages'

/** Store product CRUD + images + spec-values + duplicate (split out of `StoreService`). */
export default class StoreProductService {
  // ============================================================================
  // Products
  // ============================================================================

  static async createProduct(tenantId: string, data: CreateProductDTO): Promise<StoreProduct> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductEntity)
    const taken = await repo.findOne({ where: { tenantId, slug: data.slug } })
    if (taken) throw new Error(STORE_MESSAGES.PRODUCT_SLUG_TAKEN)
    try {
      const product = repo.create({ tenantId, ...data })
      const saved = await repo.save(product)
      await WebhookService.dispatchEvent(tenantId, 'product.created', {
        productId: saved.productId,
        slug: saved.slug,
        name: saved.name,
        status: saved.status,
      })
      return StoreProductSchema.parse(saved)
    } catch (error) {
      Logger.error(`${STORE_MESSAGES.PRODUCT_CREATE_FAILED}: ${error}`)
      throw new Error(STORE_MESSAGES.PRODUCT_CREATE_FAILED)
    }
  }

  static async updateProduct(tenantId: string, productId: string, data: UpdateProductDTO): Promise<StoreProduct> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductEntity)
    const product = await repo.findOne({ where: { tenantId, productId } })
    if (!product) throw new Error(STORE_MESSAGES.PRODUCT_NOT_FOUND)
    if (data.slug && data.slug !== product.slug) {
      const taken = await repo.findOne({ where: { tenantId, slug: data.slug } })
      if (taken) throw new Error(STORE_MESSAGES.PRODUCT_SLUG_TAKEN)
    }
    Object.assign(product, data)
    const saved = await repo.save(product)
    await redis.del(`store:product:${productId}`)
    await WebhookService.dispatchEvent(tenantId, 'product.updated', {
      productId: saved.productId,
      slug: saved.slug,
      name: saved.name,
      status: saved.status,
    })
    return StoreProductSchema.parse(saved)
  }

  static async getProduct(tenantId: string, productId: string): Promise<StoreProduct> {
    return singleFlight(`store:product:${productId}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const product = await ds.getRepository(ProductEntity).findOne({ where: { tenantId, productId } })
      if (!product) throw new Error(STORE_MESSAGES.PRODUCT_NOT_FOUND)
      return StoreProductSchema.parse(product)
    })
  }

  static async getProductDetail(tenantId: string, productId: string): Promise<StoreProductDetail> {
    return singleFlight(`store:product:detail:${productId}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const product = await ds.getRepository(ProductEntity).findOne({ where: { tenantId, productId } })
      if (!product) throw new Error(STORE_MESSAGES.PRODUCT_NOT_FOUND)

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

  static async listProducts(
    tenantId: string, query: GetProductsQuery,
  ): Promise<{ data: StoreProduct[]; total: number }> {
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
      .where('p."tenantId" = :tenantId', { tenantId })
      .andWhere('p."deletedAt" IS NULL')
    if (query.categoryId) qb.andWhere('p."categoryId" = :categoryId', { categoryId: query.categoryId })
    if (query.status) qb.andWhere('p."status" = :status', { status: query.status })
    if (query.isFeatured !== undefined) qb.andWhere('p."isFeatured" = :isFeatured', { isFeatured: query.isFeatured })
    if (query.search) qb.andWhere('p."name" ILIKE :search', { search: `%${query.search}%` })

    for (const [i, f] of (query.specFilters ?? []).entries()) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM store_product_spec_values sv
          WHERE sv."productId" = p."productId"
            AND sv."tenantId"  = :tenantId
            AND sv."specId"    = :sf${i}_id
            AND sv."value"     = ANY(:sf${i}_vals)
        )`,
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
    if (!product) throw new Error(STORE_MESSAGES.PRODUCT_NOT_FOUND)
    await ds.getRepository(ProductEntity).softDelete({ tenantId, productId })
    await redis.del(`store:product:${productId}`)
    await redis.del(`store:product:detail:${productId}`)
    await WebhookService.dispatchEvent(tenantId, 'product.deleted', {
      productId,
      slug: product.slug,
      name: product.name,
    })
  }

  // ============================================================================
  // Product Images
  // ============================================================================

  static async addImage(tenantId: string, productId: string, data: AddProductImageDTO): Promise<StoreProductImage> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ImageEntity)
    if (data.isPrimary) {
      await repo.update({ tenantId, productId, isPrimary: true }, { isPrimary: false })
    }
    const image = repo.create({ tenantId, productId, ...data })
    const saved = await repo.save(image)
    await redis.del(`store:product:detail:${productId}`)
    return StoreProductImageSchema.parse(saved)
  }

  static async removeImage(tenantId: string, productId: string, imageId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    await ds.getRepository(ImageEntity).delete({ tenantId, productId, imageId })
    await redis.del(`store:product:detail:${productId}`)
  }

  // ============================================================================
  // Spec Values
  // ============================================================================

  static async setSpecValues(tenantId: string, productId: string, data: SetSpecValuesDTO): Promise<StoreProductSpecValue[]> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SpecValueEntity)
    const results: StoreProductSpecValue[] = []
    for (const { specId, value } of data.values) {
      let existing = await repo.findOne({ where: { tenantId, productId, specId } })
      if (existing) {
        existing.value = value
      } else {
        existing = repo.create({ tenantId, productId, specId, value })
      }
      const saved = await repo.save(existing)
      results.push(StoreProductSpecValueSchema.parse(saved))
    }
    await redis.del(`store:product:detail:${productId}`)
    return results
  }

  // ============================================================================
  // Duplicate
  // ============================================================================

  /**
   * Clone a product with a fresh productId. Carries over base fields, spec values
   * and image URLs. SKU is cleared, status forced to DRAFT, slug receives a random
   * suffix to stay unique. The clone is NOT added to any variant group automatically.
   */
  static async duplicateProduct(tenantId: string, productId: string): Promise<StoreProduct> {
    const ds = await tenantDataSourceFor(tenantId)
    const productRepo = ds.getRepository(ProductEntity)
    const imageRepo = ds.getRepository(ImageEntity)
    const specValueRepo = ds.getRepository(SpecValueEntity)

    const src = await productRepo.findOne({ where: { tenantId, productId } })
    if (!src) throw new Error(STORE_MESSAGES.PRODUCT_NOT_FOUND)

    const suffix = Math.random().toString(36).slice(2, 8)
    let slug = `${src.slug}-copy-${suffix}`
    if (await productRepo.findOne({ where: { tenantId, slug } })) {
      slug = `${src.slug}-copy-${Date.now().toString(36)}`
    }

    const clone = productRepo.create({
      tenantId,
      categoryId: src.categoryId,
      name: `${src.name} (Copy)`,
      slug,
      shortDescription: src.shortDescription,
      details: src.details,
      basePrice: src.basePrice,
      currency: src.currency,
      sku: undefined,
      stockQuantity: src.stockQuantity,
      trackInventory: src.trackInventory,
      allowBackorder: src.allowBackorder,
      weight: src.weight,
      weightUnit: src.weightUnit,
      dimensions: src.dimensions,
      tags: src.tags,
      status: 'DRAFT',
      isFeatured: false,
      isDigital: src.isDigital,
      digitalDownloadUrl: src.digitalDownloadUrl,
      seo: src.seo,
      sortOrder: src.sortOrder,
    })
    const savedClone = await productRepo.save(clone)

    const specValues = await specValueRepo.find({ where: { tenantId, productId } })
    if (specValues.length > 0) {
      const cloneSpecs = specValues.map((sv) => specValueRepo.create({
        tenantId, productId: savedClone.productId, specId: sv.specId, value: sv.value,
      }))
      await specValueRepo.save(cloneSpecs)
    }

    const images = await imageRepo.find({ where: { tenantId, productId } })
    if (images.length > 0) {
      const cloneImages = images.map((img) => imageRepo.create({
        tenantId, productId: savedClone.productId,
        url: img.url, altText: img.altText, sortOrder: img.sortOrder, isPrimary: img.isPrimary,
      }))
      await imageRepo.save(cloneImages)
    }

    return StoreProductSchema.parse(savedClone)
  }
}
