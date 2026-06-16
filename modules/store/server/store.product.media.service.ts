import 'reflect-metadata'
import { tenantDataSourceFor } from '@nb/db'
import redis from '@nb/redis'
import { StoreProduct as ProductEntity } from './entities/store_product.entity'
import { StoreProductImage as ImageEntity } from './entities/store_product_image.entity'
import { StoreProductSpecValue as SpecValueEntity } from './entities/store_product_spec_value.entity'
import {
  StoreProductSchema, StoreProductImageSchema, StoreProductSpecValueSchema,
  type StoreProduct, type StoreProductImage, type StoreProductSpecValue,
} from './store.types'
import type { AddProductImageDTO, SetSpecValuesDTO } from './store.dto'
import { STORE_MESSAGES } from './store.messages'
import { AppError, ErrorCode } from '@nb/common/server/app-error'

export default class StoreProductMediaService {

  static async addImage(tenantId: string, productId: string, data: AddProductImageDTO): Promise<StoreProductImage> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ImageEntity)
    if (data.isPrimary) {
      await repo.update({ tenantId, productId, isPrimary: true }, { isPrimary: false })
    }
    const saved = await repo.save(repo.create({ tenantId, productId, ...data }))
    await redis.del(`store:product:detail:${productId}`).catch(() => {})
    return StoreProductImageSchema.parse(saved)
  }

  static async removeImage(tenantId: string, productId: string, imageId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    await ds.getRepository(ImageEntity).delete({ tenantId, productId, imageId })
    await redis.del(`store:product:detail:${productId}`).catch(() => {})
  }

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
      results.push(StoreProductSpecValueSchema.parse(await repo.save(existing)))
    }
    await redis.del(`store:product:detail:${productId}`).catch(() => {})
    return results
  }

  static async duplicateProduct(tenantId: string, productId: string): Promise<StoreProduct> {
    const ds = await tenantDataSourceFor(tenantId)
    const src = await ds.getRepository(ProductEntity).findOne({ where: { tenantId, productId } })
    if (!src) throw new AppError(STORE_MESSAGES.PRODUCT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    const suffix = Math.random().toString(36).slice(2, 8)
    let slug = `${src.slug}-copy-${suffix}`
    if (await ds.getRepository(ProductEntity).findOne({ where: { tenantId, slug } })) {
      slug = `${src.slug}-copy-${Date.now().toString(36)}`
    }

    return ds.transaction(async (mgr) => {
      const productRepo = mgr.getRepository(ProductEntity)
      const imageRepo = mgr.getRepository(ImageEntity)
      const specValueRepo = mgr.getRepository(SpecValueEntity)
      const clone = productRepo.create({
        tenantId, categoryId: src.categoryId, name: `${src.name} (Copy)`, slug,
        shortDescription: src.shortDescription, details: src.details, basePrice: src.basePrice,
        currency: src.currency, sku: undefined, stockQuantity: src.stockQuantity,
        trackInventory: src.trackInventory, allowBackorder: src.allowBackorder,
        weight: src.weight, weightUnit: src.weightUnit, dimensions: src.dimensions,
        tags: src.tags, status: 'DRAFT', isFeatured: false, isDigital: src.isDigital,
        digitalDownloadUrl: src.digitalDownloadUrl, seo: src.seo, sortOrder: src.sortOrder,
      })
      const savedClone = await productRepo.save(clone)
      const specValues = await specValueRepo.find({ where: { tenantId, productId } })
      if (specValues.length > 0) {
        await specValueRepo.save(specValues.map((sv) => specValueRepo.create({
          tenantId, productId: savedClone.productId, specId: sv.specId, value: sv.value,
        })))
      }
      const images = await imageRepo.find({ where: { tenantId, productId } })
      if (images.length > 0) {
        await imageRepo.save(images.map((img) => imageRepo.create({
          tenantId, productId: savedClone.productId,
          url: img.url, altText: img.altText, sortOrder: img.sortOrder, isPrimary: img.isPrimary,
        })))
      }
      return StoreProductSchema.parse(savedClone)
    })
  }
}
