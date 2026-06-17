import { z } from 'zod'
import { CurrencyCodeEnum } from '@kuraykaraaslan/common'
import { BundleStatusEnum } from './store.enums'

// Variant Groups
export const StoreVariantGroupSchema = z.object({
  variantGroupId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type StoreVariantGroup = z.infer<typeof StoreVariantGroupSchema>

export const StoreVariantGroupItemSchema = z.object({
  itemId: z.string().uuid(),
  tenantId: z.string().uuid(),
  variantGroupId: z.string().uuid(),
  productId: z.string().uuid(),
  label: z.string().nullable(),
  sortOrder: z.coerce.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type StoreVariantGroupItem = z.infer<typeof StoreVariantGroupItemSchema>

// Bundles
export const StoreBundleSchema = z.object({
  bundleId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  richDescription: z.unknown().nullable(),
  bundlePrice: z.coerce.number().nullable(),
  discountPercent: z.coerce.number().nullable(),
  currency: CurrencyCodeEnum,
  imageUrl: z.string().nullable(),
  status: BundleStatusEnum,
  availableFrom: z.date().nullable(),
  availableTo: z.date().nullable(),
  sortOrder: z.coerce.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type StoreBundle = z.infer<typeof StoreBundleSchema>

export const StoreBundleItemSchema = z.object({
  bundleItemId: z.string().uuid(),
  tenantId: z.string().uuid(),
  bundleId: z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  quantity: z.coerce.number().int(),
  overridePrice: z.coerce.number().nullable(),
  sortOrder: z.coerce.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type StoreBundleItem = z.infer<typeof StoreBundleItemSchema>

/** Bundle item enriched with the referenced product's name + base price for display. */
export const StoreBundleItemWithProductSchema = StoreBundleItemSchema.extend({
  productName: z.string().nullable(),
  productBasePrice: z.coerce.number().nullable(),
  productCurrency: CurrencyCodeEnum.nullable(),
})
export type StoreBundleItemWithProduct = z.infer<typeof StoreBundleItemWithProductSchema>

export const StoreBundleWithItemsSchema = StoreBundleSchema.omit({ deletedAt: true }).extend({
  items: z.array(StoreBundleItemWithProductSchema),
})
export type StoreBundleWithItems = z.infer<typeof StoreBundleWithItemsSchema>
