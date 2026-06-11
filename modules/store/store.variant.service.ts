import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import { StoreProduct as ProductEntity } from './entities/store_product.entity'
import { StoreVariantGroup as VariantGroupEntity } from './entities/store_variant_group.entity'
import { StoreVariantGroupItem as VariantGroupItemEntity } from './entities/store_variant_group_item.entity'
import {
  StoreVariantGroupSchema, StoreVariantGroupItemSchema,
  type StoreVariantGroup, type StoreVariantGroupItem,
} from './store.types'
import type {
  AddVariantGroupItemDTO, UpdateVariantGroupItemDTO,
} from './store.dto'
import { STORE_MESSAGES } from './store.messages'
import { AppError, ErrorCode } from '@/modules/common/app-error'

/** Store product variant-group management (split out of `StoreService`). */
export default class StoreVariantService {
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
      throw new AppError(STORE_MESSAGES.VARIANT_GROUP_SELF, 422, ErrorCode.VALIDATION_ERROR)
    }
    const ds = await tenantDataSourceFor(tenantId)

    const [anchor, target] = await Promise.all([
      ds.getRepository(ProductEntity).findOne({ where: { tenantId, productId: anchorProductId } }),
      ds.getRepository(ProductEntity).findOne({ where: { tenantId, productId: data.productId } }),
    ])
    if (!anchor) throw new AppError(STORE_MESSAGES.PRODUCT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (!target) throw new AppError(STORE_MESSAGES.PRODUCT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    const targetExisting = await ds.getRepository(VariantGroupItemEntity).findOne({ where: { tenantId, productId: data.productId } })
    if (targetExisting) {
      throw new AppError(STORE_MESSAGES.VARIANT_GROUP_ALREADY_MEMBER, 409, ErrorCode.CONFLICT)
    }

    return ds.transaction(async (mgr) => {
      const itemRepo = mgr.getRepository(VariantGroupItemEntity)
      const groupRepo = mgr.getRepository(VariantGroupEntity)

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
    })
  }

  static async updateVariantGroupItem(
    tenantId: string, itemId: string, data: UpdateVariantGroupItemDTO,
  ): Promise<StoreVariantGroupItem> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(VariantGroupItemEntity)
    const item = await repo.findOne({ where: { tenantId, itemId } })
    if (!item) throw new AppError(STORE_MESSAGES.VARIANT_GROUP_ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
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
    const item = await ds.getRepository(VariantGroupItemEntity).findOne({ where: { tenantId, itemId } })
    if (!item) throw new AppError(STORE_MESSAGES.VARIANT_GROUP_ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const groupId = item.variantGroupId

    await ds.transaction(async (mgr) => {
      const itemRepo = mgr.getRepository(VariantGroupItemEntity)
      const groupRepo = mgr.getRepository(VariantGroupEntity)
      await itemRepo.remove(item)
      const remaining = await itemRepo.count({ where: { tenantId, variantGroupId: groupId } })
      if (remaining < 2) {
        await itemRepo.delete({ tenantId, variantGroupId: groupId })
        await groupRepo.delete({ tenantId, variantGroupId: groupId })
      }
    })
  }
}
