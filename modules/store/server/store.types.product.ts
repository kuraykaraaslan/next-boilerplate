import { z } from 'zod'
import { CurrencyCodeEnum } from '@nb/common'
import { ProductStatusEnum, FulfillmentTypeEnum } from './store.enums'
import {
  PriceListSchema, CountryPricesSchema, ProductTranslationsSchema, WarehouseStockSchema,
} from './store.types.shared'

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
  priceList: PriceListSchema,
  countryPrices: CountryPricesSchema,
  salePrice: z.coerce.number().nullable().optional(),
  saleStartsAt: z.date().nullable().optional(),
  saleEndsAt: z.date().nullable().optional(),
  taxClass: z.string().nullable().optional(),
  priceIncludesTax: z.boolean().default(false),
  translations: ProductTranslationsSchema,
  availableCountries: z.array(z.string()).nullable().optional(),
  restrictedCountries: z.array(z.string()).nullable().optional(),
  warehouseStock: WarehouseStockSchema,
  fulfillmentType: FulfillmentTypeEnum.default('IN_STOCK'),
  restockDate: z.date().nullable().optional(),
  preorderReleaseDate: z.date().nullable().optional(),
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

// Full product detail (admin view)
export const StoreProductDetailSchema = StoreProductSchema.omit({ deletedAt: true }).extend({
  images: z.array(StoreProductImageSchema),
  specValues: z.array(StoreProductSpecValueSchema),
})
export type StoreProductDetail = z.infer<typeof StoreProductDetailSchema>
