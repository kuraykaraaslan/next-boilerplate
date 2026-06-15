import { z } from 'zod'
import { VariationDisplayTypeEnum } from './store.enums'

// Variant Group DTOs
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

// Variation DTOs
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
  warehouseStock: z.record(z.string(), z.coerce.number().int().nonnegative()).optional(),
  salePrice: z.coerce.number().nonnegative().optional(),
  saleStartsAt: z.coerce.date().optional(),
  saleEndsAt: z.coerce.date().optional(),
  weight: z.coerce.number().nonnegative().optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
})
export type CreateVariantDTO = z.infer<typeof CreateVariantDTO>

export const UpdateVariantDTO = CreateVariantDTO.partial()
export type UpdateVariantDTO = z.infer<typeof UpdateVariantDTO>
