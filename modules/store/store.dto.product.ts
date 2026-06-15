import { z } from 'zod'
import { CurrencyCodeInput, DEFAULT_CURRENCY } from '@/modules/common'
import { ProductStatusEnum, FulfillmentTypeEnum } from './store.enums'

export const CreateProductDTO = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(500),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/),
  shortDescription: z.string().max(500).optional(),
  details: z.string().optional(),
  basePrice: z.coerce.number().nonnegative(),
  currency: CurrencyCodeInput.default(DEFAULT_CURRENCY),
  priceList: z.record(z.string(), z.coerce.number().nonnegative()).optional(),
  countryPrices: z.record(z.string(), z.object({
    amount: z.coerce.number().nonnegative(), currency: z.string(),
  })).optional(),
  salePrice: z.coerce.number().nonnegative().optional(),
  saleStartsAt: z.coerce.date().optional(),
  saleEndsAt: z.coerce.date().optional(),
  taxClass: z.string().max(50).optional(),
  priceIncludesTax: z.boolean().default(false),
  translations: z.record(z.string(), z.object({
    name: z.string().optional(), shortDescription: z.string().optional(), details: z.string().optional(),
  })).optional(),
  availableCountries: z.array(z.string()).optional(),
  restrictedCountries: z.array(z.string()).optional(),
  warehouseStock: z.record(z.string(), z.coerce.number().int().nonnegative()).optional(),
  fulfillmentType: FulfillmentTypeEnum.default('IN_STOCK'),
  restockDate: z.coerce.date().optional(),
  preorderReleaseDate: z.coerce.date().optional(),
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

// Product Images
export const AddProductImageDTO = z.object({
  url: z.string().url(),
  altText: z.string().optional(),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
  isPrimary: z.boolean().default(false),
  variantId: z.string().uuid().optional(),
})
export type AddProductImageDTO = z.infer<typeof AddProductImageDTO>

// Spec Values
export const SetSpecValuesDTO = z.object({
  values: z.array(z.object({
    specId: z.string().uuid(),
    value: z.string(),
  })),
})
export type SetSpecValuesDTO = z.infer<typeof SetSpecValuesDTO>
