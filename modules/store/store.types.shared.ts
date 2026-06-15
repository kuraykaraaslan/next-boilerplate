import { z } from 'zod'

// Shared shapes for the internationalisation / pricing extensions.
export const PriceListSchema = z.record(z.string(), z.coerce.number()).nullable().optional()
export const CountryPricesSchema = z.record(z.string(), z.object({
  amount: z.coerce.number(), currency: z.string(),
})).nullable().optional()
export const ProductTranslationsSchema = z.record(z.string(), z.object({
  name: z.string().optional(), shortDescription: z.string().optional(), details: z.string().optional(),
})).nullable().optional()
export const CategoryTranslationsSchema = z.record(z.string(), z.object({
  name: z.string().optional(), description: z.string().optional(),
})).nullable().optional()
export const WarehouseStockSchema = z.record(z.string(), z.coerce.number().int()).nullable().optional()
