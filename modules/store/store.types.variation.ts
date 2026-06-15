import { z } from 'zod'
import { VariationDisplayTypeEnum } from './store.enums'
import { WarehouseStockSchema } from './store.types.shared'

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
  warehouseStock: WarehouseStockSchema,
  salePrice: z.coerce.number().nullable().optional(),
  saleStartsAt: z.date().nullable().optional(),
  saleEndsAt: z.date().nullable().optional(),
  weight: z.coerce.number().nullable(),
  imageUrl: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type StoreProductVariant = z.infer<typeof StoreProductVariantSchema>
