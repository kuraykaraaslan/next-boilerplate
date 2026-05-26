import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight } from '@/modules/redis'
import Logger from '@/modules/logger'
import { StoreCategory as CategoryEntity } from './entities/store_category.entity'
import { StoreCategorySpec as SpecEntity } from './entities/store_category_spec.entity'
import { StoreProduct as ProductEntity } from './entities/store_product.entity'
import { StoreProductImage as ImageEntity } from './entities/store_product_image.entity'
import { StoreProductSpecValue as SpecValueEntity } from './entities/store_product_spec_value.entity'
import { StoreVariantGroup as VariantGroupEntity } from './entities/store_variant_group.entity'
import { StoreVariantGroupItem as VariantGroupItemEntity } from './entities/store_variant_group_item.entity'
import { StoreBundle as BundleEntity } from './entities/store_bundle.entity'
import { StoreBundleItem as BundleItemEntity } from './entities/store_bundle_item.entity'
import {
  StoreCategorySchema, StoreCategorySpecSchema, StoreCategoryWithSpecsSchema,
  StoreProductSchema, StoreProductImageSchema, StoreProductSpecValueSchema,
  StoreProductDetailSchema,
  StoreVariantGroupSchema, StoreVariantGroupItemSchema,
  StoreBundleSchema, StoreBundleItemSchema, StoreBundleWithItemsSchema,
  type StoreCategory, type StoreCategorySpec, type StoreCategoryWithSpecs,
  type StoreProduct, type StoreProductImage, type StoreProductSpecValue,
  type StoreProductDetail,
  type StoreVariantGroup, type StoreVariantGroupItem,
  type StoreBundle, type StoreBundleItem, type StoreBundleWithItems,
} from './store.types'
import type {
  CreateCategoryDTO, UpdateCategoryDTO, GetCategoriesQuery,
  CreateSpecDTO, UpdateSpecDTO,
  CreateProductDTO, UpdateProductDTO, GetProductsQuery,
  AddProductImageDTO, SetSpecValuesDTO,
  AddVariantGroupItemDTO, UpdateVariantGroupItemDTO,
  CreateBundleDTO, UpdateBundleDTO, AddBundleItemDTO, GetBundlesQuery,
} from './store.dto'
import { STORE_MESSAGES } from './store.messages'

const CACHE_TTL = 300

export default class StoreService {

  // ============================================================================
  // Categories
  // ============================================================================

  static async createCategory(tenantId: string, data: CreateCategoryDTO): Promise<StoreCategory> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(CategoryEntity)
    const existing = await repo.findOne({ where: { tenantId, slug: data.slug } })
    if (existing) throw new Error(STORE_MESSAGES.CATEGORY_SLUG_TAKEN)
    try {
      const category = repo.create({ tenantId, ...data })
      const saved = await repo.save(category)
      await redis.del(`store:cats:${tenantId}`)
      return StoreCategorySchema.parse(saved)
    } catch (error) {
      Logger.error(`${STORE_MESSAGES.CATEGORY_CREATE_FAILED}: ${error}`)
      throw new Error(STORE_MESSAGES.CATEGORY_CREATE_FAILED)
    }
  }

  static async updateCategory(tenantId: string, categoryId: string, data: UpdateCategoryDTO): Promise<StoreCategory> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(CategoryEntity)
    const category = await repo.findOne({ where: { tenantId, categoryId } })
    if (!category) throw new Error(STORE_MESSAGES.CATEGORY_NOT_FOUND)
    if (data.slug && data.slug !== category.slug) {
      const taken = await repo.findOne({ where: { tenantId, slug: data.slug } })
      if (taken) throw new Error(STORE_MESSAGES.CATEGORY_SLUG_TAKEN)
    }
    Object.assign(category, data)
    const saved = await repo.save(category)
    await redis.del(`store:cats:${tenantId}`)
    await redis.del(`store:cat:${categoryId}`)
    return StoreCategorySchema.parse(saved)
  }

  static async getCategory(tenantId: string, categoryId: string, withSpecs = false): Promise<StoreCategory | StoreCategoryWithSpecs> {
    return singleFlight(`store:cat:${categoryId}:${withSpecs}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const cat = await ds.getRepository(CategoryEntity).findOne({ where: { tenantId, categoryId } })
      if (!cat) throw new Error(STORE_MESSAGES.CATEGORY_NOT_FOUND)
      if (!withSpecs) return StoreCategorySchema.parse(cat)
      const specs = await ds.getRepository(SpecEntity).find({
        where: { tenantId, categoryId }, order: { sortOrder: 'ASC' },
      })
      return StoreCategoryWithSpecsSchema.parse({ ...cat, specs, children: [] })
    })
  }

  static async listCategories(
    tenantId: string, query: GetCategoriesQuery,
  ): Promise<{ data: Array<StoreCategory | StoreCategoryWithSpecs>; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.parentId !== undefined) where['parentId'] = query.parentId
    if (query.isActive !== undefined) where['isActive'] = query.isActive
    const [rows, total] = await ds.getRepository(CategoryEntity).findAndCount({
      where, order: { sortOrder: 'ASC', name: 'ASC' },
      skip: query.page * query.pageSize, take: query.pageSize,
    })
    if (!query.withSpecs) return { data: rows.map((r) => StoreCategorySchema.parse(r)), total }
    const specRepo = ds.getRepository(SpecEntity)
    const catIds = rows.map((r) => r.categoryId)
    const allSpecs = catIds.length
      ? await specRepo.find({ where: catIds.map((id) => ({ tenantId, categoryId: id })) })
      : []
    const specMap = new Map<string, StoreCategorySpec[]>()
    for (const s of allSpecs) {
      const arr = specMap.get(s.categoryId) ?? []
      arr.push(StoreCategorySpecSchema.parse(s))
      specMap.set(s.categoryId, arr)
    }
    return {
      data: rows.map((r) => StoreCategoryWithSpecsSchema.parse({
        ...r, specs: specMap.get(r.categoryId) ?? [], children: [],
      })),
      total,
    }
  }

  static async deleteCategory(tenantId: string, categoryId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const productCount = await ds.getRepository(ProductEntity).count({ where: { tenantId, categoryId } })
    if (productCount > 0) throw new Error(STORE_MESSAGES.CATEGORY_HAS_PRODUCTS)
    await ds.getRepository(CategoryEntity).softDelete({ tenantId, categoryId })
    await redis.del(`store:cats:${tenantId}`)
    await redis.del(`store:cat:${categoryId}:true`)
    await redis.del(`store:cat:${categoryId}:false`)
  }

  // ============================================================================
  // Category Specs
  // ============================================================================

  static async upsertSpec(tenantId: string, categoryId: string, data: CreateSpecDTO): Promise<StoreCategorySpec> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SpecEntity)
    let spec = await repo.findOne({ where: { tenantId, categoryId, key: data.key } })
    if (spec) {
      Object.assign(spec, data)
    } else {
      spec = repo.create({ tenantId, categoryId, ...data })
    }
    const saved = await repo.save(spec)
    await redis.del(`store:cat:${categoryId}:true`)
    return StoreCategorySpecSchema.parse(saved)
  }

  static async deleteSpec(tenantId: string, categoryId: string, specId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    await ds.getRepository(SpecEntity).delete({ tenantId, categoryId, specId })
    await redis.del(`store:cat:${categoryId}:true`)
  }

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
  // Bundles
  // ============================================================================

  static async createBundle(tenantId: string, data: CreateBundleDTO): Promise<StoreBundle> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(BundleEntity)
    const taken = await repo.findOne({ where: { tenantId, slug: data.slug } })
    if (taken) throw new Error(STORE_MESSAGES.BUNDLE_SLUG_TAKEN)
    try {
      const bundle = repo.create({ tenantId, ...data })
      const saved = await repo.save(bundle)
      return StoreBundleSchema.parse(saved)
    } catch (error) {
      Logger.error(`${STORE_MESSAGES.BUNDLE_CREATE_FAILED}: ${error}`)
      throw new Error(STORE_MESSAGES.BUNDLE_CREATE_FAILED)
    }
  }

  static async updateBundle(tenantId: string, bundleId: string, data: UpdateBundleDTO): Promise<StoreBundle> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(BundleEntity)
    const bundle = await repo.findOne({ where: { tenantId, bundleId } })
    if (!bundle) throw new Error(STORE_MESSAGES.BUNDLE_NOT_FOUND)
    if (data.slug && data.slug !== bundle.slug) {
      const taken = await repo.findOne({ where: { tenantId, slug: data.slug } })
      if (taken) throw new Error(STORE_MESSAGES.BUNDLE_SLUG_TAKEN)
    }
    Object.assign(bundle, data)
    const saved = await repo.save(bundle)
    await redis.del(`store:bundle:${bundleId}`)
    return StoreBundleSchema.parse(saved)
  }

  static async getBundle(tenantId: string, bundleId: string, withItems = false): Promise<StoreBundle | StoreBundleWithItems> {
    return singleFlight(`store:bundle:${bundleId}:${withItems}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const bundle = await ds.getRepository(BundleEntity).findOne({ where: { tenantId, bundleId } })
      if (!bundle) throw new Error(STORE_MESSAGES.BUNDLE_NOT_FOUND)
      if (!withItems) return StoreBundleSchema.parse(bundle)
      const items = await ds.getRepository(BundleItemEntity).find({
        where: { tenantId, bundleId }, order: { sortOrder: 'ASC' },
      })
      return StoreBundleWithItemsSchema.parse({ ...bundle, items })
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
    if (!bundle) throw new Error(STORE_MESSAGES.BUNDLE_NOT_FOUND)
    const product = await ds.getRepository(ProductEntity).findOne({ where: { tenantId, productId: data.productId } })
    if (!product) throw new Error(STORE_MESSAGES.PRODUCT_NOT_FOUND)
    const item = ds.getRepository(BundleItemEntity).create({ tenantId, bundleId, ...data })
    const saved = await ds.getRepository(BundleItemEntity).save(item)
    await redis.del(`store:bundle:${bundleId}:true`)
    return StoreBundleItemSchema.parse(saved)
  }

  static async removeBundleItem(tenantId: string, bundleId: string, bundleItemId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    await ds.getRepository(BundleItemEntity).delete({ tenantId, bundleId, bundleItemId })
    await redis.del(`store:bundle:${bundleId}:true`)
  }

  static async deleteBundle(tenantId: string, bundleId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const bundle = await ds.getRepository(BundleEntity).findOne({ where: { tenantId, bundleId } })
    if (!bundle) throw new Error(STORE_MESSAGES.BUNDLE_NOT_FOUND)
    await ds.getRepository(BundleEntity).softDelete({ tenantId, bundleId })
    await redis.del(`store:bundle:${bundleId}:true`)
    await redis.del(`store:bundle:${bundleId}:false`)
  }

  // ============================================================================
  // Variant Groups
  // ============================================================================

  /** Resolve the variant group a product currently belongs to (if any). */
  static async getVariantGroupForProduct(
    tenantId: string, productId: string,
  ): Promise<{ group: StoreVariantGroup; items: StoreVariantGroupItem[] } | null> {
    const ds = await tenantDataSourceFor(tenantId)
    const itemRepo = ds.getRepository(VariantGroupItemEntity)
    const ownership = await itemRepo.findOne({ where: { tenantId, productId } })
    if (!ownership) return null
    const groupRepo = ds.getRepository(VariantGroupEntity)
    const group = await groupRepo.findOne({ where: { tenantId, variantGroupId: ownership.variantGroupId } })
    if (!group) return null
    const items = await itemRepo.find({
      where: { tenantId, variantGroupId: ownership.variantGroupId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    })
    return {
      group: StoreVariantGroupSchema.parse(group),
      items: items.map((i) => StoreVariantGroupItemSchema.parse(i)),
    }
  }

  /**
   * Add a product to the variant group of `anchorProductId`.
   * If `anchorProductId` has no group yet, create one and add the anchor as the first item.
   */
  static async addToVariantGroup(
    tenantId: string, anchorProductId: string, data: AddVariantGroupItemDTO,
  ): Promise<{ group: StoreVariantGroup; item: StoreVariantGroupItem }> {
    if (data.productId === anchorProductId) {
      throw new Error('A product cannot be a variant of itself.')
    }
    const ds = await tenantDataSourceFor(tenantId)
    const productRepo = ds.getRepository(ProductEntity)
    const itemRepo = ds.getRepository(VariantGroupItemEntity)
    const groupRepo = ds.getRepository(VariantGroupEntity)

    const [anchor, target] = await Promise.all([
      productRepo.findOne({ where: { tenantId, productId: anchorProductId } }),
      productRepo.findOne({ where: { tenantId, productId: data.productId } }),
    ])
    if (!anchor) throw new Error(STORE_MESSAGES.PRODUCT_NOT_FOUND)
    if (!target) throw new Error(STORE_MESSAGES.PRODUCT_NOT_FOUND)

    const targetExisting = await itemRepo.findOne({ where: { tenantId, productId: data.productId } })
    if (targetExisting) {
      throw new Error('Target product already belongs to a variant group.')
    }

    let groupId: string
    const anchorMembership = await itemRepo.findOne({ where: { tenantId, productId: anchorProductId } })
    if (anchorMembership) {
      groupId = anchorMembership.variantGroupId
    } else {
      const group = groupRepo.create({ tenantId })
      const saved = await groupRepo.save(group)
      groupId = saved.variantGroupId
      const anchorItem = itemRepo.create({
        tenantId, variantGroupId: groupId, productId: anchorProductId, sortOrder: 0,
      })
      await itemRepo.save(anchorItem)
    }

    const item = itemRepo.create({
      tenantId,
      variantGroupId: groupId,
      productId: data.productId,
      label: data.label,
      sortOrder: data.sortOrder,
    })
    const saved = await itemRepo.save(item)
    const group = await groupRepo.findOneOrFail({ where: { tenantId, variantGroupId: groupId } })

    return {
      group: StoreVariantGroupSchema.parse(group),
      item: StoreVariantGroupItemSchema.parse(saved),
    }
  }

  static async updateVariantGroupItem(
    tenantId: string, itemId: string, data: UpdateVariantGroupItemDTO,
  ): Promise<StoreVariantGroupItem> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(VariantGroupItemEntity)
    const item = await repo.findOne({ where: { tenantId, itemId } })
    if (!item) throw new Error('Variant group item not found.')
    if (data.label !== undefined) item.label = data.label ?? undefined
    if (data.sortOrder !== undefined) item.sortOrder = data.sortOrder
    const saved = await repo.save(item)
    return StoreVariantGroupItemSchema.parse(saved)
  }

  /**
   * Remove a product from its variant group.
   * If the group ends up with fewer than 2 items, drop the group entirely.
   */
  static async removeFromVariantGroup(tenantId: string, itemId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const itemRepo = ds.getRepository(VariantGroupItemEntity)
    const groupRepo = ds.getRepository(VariantGroupEntity)
    const item = await itemRepo.findOne({ where: { tenantId, itemId } })
    if (!item) throw new Error('Variant group item not found.')
    const groupId = item.variantGroupId
    await itemRepo.remove(item)
    const remaining = await itemRepo.count({ where: { tenantId, variantGroupId: groupId } })
    if (remaining < 2) {
      await itemRepo.delete({ tenantId, variantGroupId: groupId })
      await groupRepo.delete({ tenantId, variantGroupId: groupId })
    }
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
