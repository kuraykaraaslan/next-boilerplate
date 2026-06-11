import { z } from 'zod'
import { CurrencyCodeEnum } from '@/modules/common'
import { ProductStatusEnum, BundleStatusEnum, CategorySpecTypeEnum, VariationDisplayTypeEnum } from './store.enums'

// ============================================================================
// Category
// ============================================================================

export const StoreCategorySchema = z.object({
  categoryId: z.string().uuid(),
  tenantId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  sortOrder: z.coerce.number().int(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type StoreCategory = z.infer<typeof StoreCategorySchema>

export const StoreCategorySpecSchema = z.object({
  specId: z.string().uuid(),
  tenantId: z.string().uuid(),
  categoryId: z.string().uuid(),
  key: z.string(),
  label: z.string(),
  type: CategorySpecTypeEnum,
  unit: z.string().nullable(),
  placeholder: z.string().nullable(),
  options: z.array(z.string()).nullable(),
  isRequired: z.boolean(),
  isFilterable: z.boolean(),
  sortOrder: z.coerce.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type StoreCategorySpec = z.infer<typeof StoreCategorySpecSchema>

export const StoreCategoryWithSpecsSchema = StoreCategorySchema.extend({
  specs: z.array(StoreCategorySpecSchema),
  children: z.array(StoreCategorySchema).optional(),
})
export type StoreCategoryWithSpecs = z.infer<typeof StoreCategoryWithSpecsSchema>

// ============================================================================
// Product
// ============================================================================

export const ProductDimensionsSchema = z.object({
  length: z.coerce.number().optional(),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  unit: z.string().optional(),
})

export const ProductSeoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
})

export const StoreProductSchema = z.object({
  productId: z.string().uuid(),
  tenantId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  shortDescription: z.string().nullable(),
  details: z.string().nullable(),
  basePrice: z.coerce.number(),
  currency: CurrencyCodeEnum,
  sku: z.string().nullable(),
  stockQuantity: z.coerce.number().int().nullable(),
  trackInventory: z.boolean(),
  allowBackorder: z.boolean(),
  weight: z.coerce.number().nullable(),
  weightUnit: z.string().nullable(),
  dimensions: ProductDimensionsSchema.nullable(),
  tags: z.array(z.string()).nullable(),
  status: ProductStatusEnum,
  isFeatured: z.boolean(),
  isDigital: z.boolean(),
  digitalDownloadUrl: z.string().nullable(),
  seo: ProductSeoSchema.nullable(),
  sortOrder: z.coerce.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type StoreProduct = z.infer<typeof StoreProductSchema>

export const StoreProductImageSchema = z.object({
  imageId: z.string().uuid(),
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  url: z.string(),
  altText: z.string().nullable(),
  sortOrder: z.coerce.number().int(),
  isPrimary: z.boolean(),
  createdAt: z.date(),
})
export type StoreProductImage = z.infer<typeof StoreProductImageSchema>

export const StoreProductSpecValueSchema = z.object({
  specValueId: z.string().uuid(),
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  specId: z.string().uuid(),
  value: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type StoreProductSpecValue = z.infer<typeof StoreProductSpecValueSchema>

// ============================================================================
// Variations
// ============================================================================

export const StoreVariationTypeSchema = z.object({
  variationTypeId: z.string().uuid(),
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  name: z.string(),
  displayType: VariationDisplayTypeEnum,
  sortOrder: z.coerce.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type StoreVariationType = z.infer<typeof StoreVariationTypeSchema>

export const StoreVariationOptionSchema = z.object({
  optionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  variationTypeId: z.string().uuid(),
  label: z.string(),
  value: z.string(),
  swatch: z.string().nullable(),
  sortOrder: z.coerce.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type StoreVariationOption = z.infer<typeof StoreVariationOptionSchema>

export const StoreVariationTypeWithOptionsSchema = StoreVariationTypeSchema.extend({
  options: z.array(StoreVariationOptionSchema),
})
export type StoreVariationTypeWithOptions = z.infer<typeof StoreVariationTypeWithOptionsSchema>

export const StoreProductVariantSchema = z.object({
  variantId: z.string().uuid(),
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  optionIds: z.array(z.string().uuid()),
  sku: z.string().nullable(),
  price: z.coerce.number().nullable(),
  stockQuantity: z.coerce.number().int().nullable(),
  weight: z.coerce.number().nullable(),
  imageUrl: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type StoreProductVariant = z.infer<typeof StoreProductVariantSchema>

// ============================================================================
// Full product detail (admin view)
// ============================================================================

export const StoreProductDetailSchema = StoreProductSchema.omit({ deletedAt: true }).extend({
  images: z.array(StoreProductImageSchema),
  specValues: z.array(StoreProductSpecValueSchema),
})
export type StoreProductDetail = z.infer<typeof StoreProductDetailSchema>

// ============================================================================
// Variant Groups
// ============================================================================

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

// ============================================================================
// Bundles
// ============================================================================

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
