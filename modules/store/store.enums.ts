import { z } from 'zod'

export const ProductStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'OUT_OF_STOCK'])
export type ProductStatus = z.infer<typeof ProductStatusEnum>

export const BundleStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'SCHEDULED'])
export type BundleStatus = z.infer<typeof BundleStatusEnum>

export const CategorySpecTypeEnum = z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'DATE', 'COLOR'])
export type CategorySpecType = z.infer<typeof CategorySpecTypeEnum>

export const VariationDisplayTypeEnum = z.enum(['TEXT', 'COLOR_SWATCH', 'IMAGE_SWATCH', 'BUTTON', 'DROPDOWN'])
export type VariationDisplayType = z.infer<typeof VariationDisplayTypeEnum>
