import { z } from 'zod'

// ============================================================================
// Supplier DTOs
// ============================================================================

export const CreateSupplierDTO = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  categoryId: z.string().uuid().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  taxNumber: z.string().optional(),
  isActive: z.boolean().optional().default(false),
})
export type CreateSupplierDTO = z.infer<typeof CreateSupplierDTO>

export const UpdateSupplierDTO = CreateSupplierDTO.partial()
export type UpdateSupplierDTO = z.infer<typeof UpdateSupplierDTO>

export const GetSuppliersQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetSuppliersQuery = z.infer<typeof GetSuppliersQuery>

// ============================================================================
// SupplierCategory DTOs (configurable master-data)
// ============================================================================

export const CreateSupplierCategoryDTO = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  isActive: z.boolean().optional().default(false),
})
export type CreateSupplierCategoryDTO = z.infer<typeof CreateSupplierCategoryDTO>

export const UpdateSupplierCategoryDTO = CreateSupplierCategoryDTO.partial()
export type UpdateSupplierCategoryDTO = z.infer<typeof UpdateSupplierCategoryDTO>

export const GetSupplierCategoriesQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetSupplierCategoriesQuery = z.infer<typeof GetSupplierCategoriesQuery>

// ============================================================================
// SupplierContact DTOs (line items on supplier)
// ============================================================================

export const AddSupplierContactDTO = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
})
export type AddSupplierContactDTO = z.infer<typeof AddSupplierContactDTO>

export const UpdateSupplierContactDTO = AddSupplierContactDTO.partial()
export type UpdateSupplierContactDTO = z.infer<typeof UpdateSupplierContactDTO>

export const GetSupplierContactsQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(200).default(100),
  search: z.string().optional(),
})
export type GetSupplierContactsQuery = z.infer<typeof GetSupplierContactsQuery>
