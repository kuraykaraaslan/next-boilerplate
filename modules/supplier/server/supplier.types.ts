import { z } from 'zod'

// ============================================================================
// Supplier
// ============================================================================

export const SupplierSchema = z.object({
  supplierId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  categoryId: z.string().uuid().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  taxNumber: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type Supplier = z.infer<typeof SupplierSchema>

export const SafeSupplierSchema = SupplierSchema.omit({ deletedAt: true })
export type SafeSupplier = z.infer<typeof SafeSupplierSchema>

// ============================================================================
// SupplierContact
// ============================================================================

export const SupplierContactSchema = z.object({
  contactId: z.string().uuid(),
  tenantId: z.string().uuid(),
  supplierId: z.string().uuid(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type SupplierContact = z.infer<typeof SupplierContactSchema>

// ============================================================================
// SupplierCategory
// ============================================================================

export const SupplierCategorySchema = z.object({
  categoryId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type SupplierCategory = z.infer<typeof SupplierCategorySchema>
