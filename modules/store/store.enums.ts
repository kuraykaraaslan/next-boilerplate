import { z } from 'zod'

// PENDING_REVIEW / APPROVED support the marketplace editorial workflow
// (DRAFT → PENDING_REVIEW → APPROVED → ACTIVE) alongside the direct flow.
export const ProductStatusEnum = z.enum(['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE', 'ARCHIVED', 'OUT_OF_STOCK'])
export type ProductStatus = z.infer<typeof ProductStatusEnum>

// Fulfillment semantics distinguishing the UX/legal disclosure shown to buyers.
export const FulfillmentTypeEnum = z.enum(['IN_STOCK', 'BACKORDER', 'PREORDER', 'DIGITAL_UNLIMITED'])
export type FulfillmentType = z.infer<typeof FulfillmentTypeEnum>

export const BundleStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'SCHEDULED'])
export type BundleStatus = z.infer<typeof BundleStatusEnum>

export const CategorySpecTypeEnum = z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'DATE', 'COLOR'])
export type CategorySpecType = z.infer<typeof CategorySpecTypeEnum>

export const VariationDisplayTypeEnum = z.enum(['TEXT', 'COLOR_SWATCH', 'IMAGE_SWATCH', 'BUTTON', 'DROPDOWN'])
export type VariationDisplayType = z.infer<typeof VariationDisplayTypeEnum>
