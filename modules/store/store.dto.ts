import { z } from 'zod'
import { CurrencyCodeInput, DEFAULT_CURRENCY } from '@/modules/common'
import { ProductStatusEnum, BundleStatusEnum, CategorySpecTypeEnum, VariationDisplayTypeEnum } from './store.enums'

// ============================================================================
// Category DTOs
// ============================================================================

export const CreateCategoryDTO = z.object({
  parentId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
})
export type CreateCategoryDTO = z.infer<typeof CreateCategoryDTO>

export const UpdateCategoryDTO = CreateCategoryDTO.partial()
export type UpdateCategoryDTO = z.infer<typeof UpdateCategoryDTO>

export const GetCategoriesQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(200).default(50),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  withSpecs: z.boolean().default(false),
  withChildren: z.boolean().default(false),
})
export type GetCategoriesQuery = z.infer<typeof GetCategoriesQuery>

// ============================================================================
// Spec DTOs
// ============================================================================

export const CreateSpecDTO = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1).max(100),
  type: CategorySpecTypeEnum.default('TEXT'),
  unit: z.string().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  isFilterable: z.boolean().default(true),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
})
export type CreateSpecDTO = z.infer<typeof CreateSpecDTO>

export const UpdateSpecDTO = CreateSpecDTO.partial()
export type UpdateSpecDTO = z.infer<typeof UpdateSpecDTO>

// ============================================================================
// Product DTOs
// ============================================================================

export const CreateProductDTO = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(500),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/),
  shortDescription: z.string().max(500).optional(),
  details: z.string().optional(),
  basePrice: z.coerce.number().nonnegative(),
  currency: CurrencyCodeInput.default(DEFAULT_CURRENCY),
  sku: z.string().max(100).optional(),
  stockQuantity: z.coerce.number().int().nonnegative().optional(),
  trackInventory: z.boolean().default(true),
  allowBackorder: z.boolean().default(false),
  weight: z.coerce.number().nonnegative().optional(),
  weightUnit: z.string().max(10).optional(),
  dimensions: z.object({
    length: z.coerce.number().optional(),
    width: z.coerce.number().optional(),
    height: z.coerce.number().optional(),
    unit: z.string().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  status: ProductStatusEnum.default('DRAFT'),
  isFeatured: z.boolean().default(false),
  isDigital: z.boolean().default(false),
  digitalDownloadUrl: z.string().url().optional(),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
})
export type CreateProductDTO = z.infer<typeof CreateProductDTO>

export const UpdateProductDTO = CreateProductDTO.partial()
export type UpdateProductDTO = z.infer<typeof UpdateProductDTO>

export const SpecFilterDTO = z.object({
  specId: z.string().uuid(),
  values: z.array(z.string()).min(1),
})
export type SpecFilterDTO = z.infer<typeof SpecFilterDTO>

export const GetProductsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  categoryId: z.string().uuid().optional(),
  status: ProductStatusEnum.optional(),
  isFeatured: z.boolean().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  specFilters: z.array(SpecFilterDTO).optional(),
})
export type GetProductsQuery = z.infer<typeof GetProductsQuery>

// ============================================================================
// Product Images
// ============================================================================

export const AddProductImageDTO = z.object({
  url: z.string().url(),
  altText: z.string().optional(),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
  isPrimary: z.boolean().default(false),
  variantId: z.string().uuid().optional(),
})
export type AddProductImageDTO = z.infer<typeof AddProductImageDTO>

// ============================================================================
// Spec Values
// ============================================================================

export const SetSpecValuesDTO = z.object({
  values: z.array(z.object({
    specId: z.string().uuid(),
    value: z.string(),
  })),
})
export type SetSpecValuesDTO = z.infer<typeof SetSpecValuesDTO>

// ============================================================================
// Variant Group DTOs
// ============================================================================

export const AddVariantGroupItemDTO = z.object({
  productId: z.string().uuid(),
  label: z.string().max(200).optional(),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
})
export type AddVariantGroupItemDTO = z.infer<typeof AddVariantGroupItemDTO>

export const UpdateVariantGroupItemDTO = z.object({
  label: z.string().max(200).nullable().optional(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
})
export type UpdateVariantGroupItemDTO = z.infer<typeof UpdateVariantGroupItemDTO>

// ============================================================================
// Variation DTOs
// ============================================================================

export const CreateVariationTypeDTO = z.object({
  name: z.string().min(1).max(100),
  displayType: VariationDisplayTypeEnum.default('TEXT'),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
})
export type CreateVariationTypeDTO = z.infer<typeof CreateVariationTypeDTO>

export const CreateVariationOptionDTO = z.object({
  label: z.string().min(1).max(100),
  value: z.string().min(1).max(100),
  swatch: z.string().optional(),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
})
export type CreateVariationOptionDTO = z.infer<typeof CreateVariationOptionDTO>

export const CreateVariantDTO = z.object({
  optionIds: z.array(z.string().uuid()).min(1),
  sku: z.string().max(100).optional(),
  price: z.coerce.number().nonnegative().optional(),
  stockQuantity: z.coerce.number().int().nonnegative().optional(),
  weight: z.coerce.number().nonnegative().optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
})
export type CreateVariantDTO = z.infer<typeof CreateVariantDTO>

export const UpdateVariantDTO = CreateVariantDTO.partial()
export type UpdateVariantDTO = z.infer<typeof UpdateVariantDTO>

// ============================================================================
// Bundle DTOs
// ============================================================================

export const CreateBundleDTO = z.object({
  name: z.string().min(1).max(500),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  richDescription: z.unknown().optional(),
  bundlePrice: z.coerce.number().nonnegative().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  currency: CurrencyCodeInput.default(DEFAULT_CURRENCY),
  imageUrl: z.string().url().optional(),
  status: BundleStatusEnum.default('DRAFT'),
  availableFrom: z.date().optional(),
  availableTo: z.date().optional(),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
})
export type CreateBundleDTO = z.infer<typeof CreateBundleDTO>

export const UpdateBundleDTO = CreateBundleDTO.partial()
export type UpdateBundleDTO = z.infer<typeof UpdateBundleDTO>

export const AddBundleItemDTO = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().positive().default(1),
  overridePrice: z.coerce.number().nonnegative().optional(),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
})
export type AddBundleItemDTO = z.infer<typeof AddBundleItemDTO>

export const UpdateBundleItemDTO = z.object({
  quantity: z.coerce.number().int().positive().optional(),
  // null clears the override, falling back to the product/variant base price
  overridePrice: z.coerce.number().nonnegative().nullable().optional(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
})
export type UpdateBundleItemDTO = z.infer<typeof UpdateBundleItemDTO>

export const GetBundlesQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  status: BundleStatusEnum.optional(),
  search: z.string().optional(),
})
export type GetBundlesQuery = z.infer<typeof GetBundlesQuery>
