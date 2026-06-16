import { z } from 'zod'
import { CurrencyCodeInput, DEFAULT_CURRENCY } from '@nb/common'
import { BundleStatusEnum } from './store.enums'

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
