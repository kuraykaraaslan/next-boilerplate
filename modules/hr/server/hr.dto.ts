import { z } from 'zod'
import { EmployeeStatusEnum } from './hr.enums'

// ============================================================================
// Department DTOs
// ============================================================================

export const CreateDepartmentDTO = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  managerId: z.string().uuid().optional(),
  isActive: z.boolean().optional().default(false),
})
export type CreateDepartmentDTO = z.infer<typeof CreateDepartmentDTO>

export const UpdateDepartmentDTO = CreateDepartmentDTO.partial()
export type UpdateDepartmentDTO = z.infer<typeof UpdateDepartmentDTO>

export const GetDepartmentsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetDepartmentsQuery = z.infer<typeof GetDepartmentsQuery>

// ============================================================================
// Employee DTOs
// ============================================================================

export const CreateEmployeeDTO = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().min(1),
  departmentId: z.string().uuid().optional(),
  title: z.string().optional(),
  status: EmployeeStatusEnum.default('ACTIVE'),
  hiredAt: z.coerce.date().optional(),
  userId: z.string().uuid().optional(),
})
export type CreateEmployeeDTO = z.infer<typeof CreateEmployeeDTO>

export const UpdateEmployeeDTO = CreateEmployeeDTO.partial()
export type UpdateEmployeeDTO = z.infer<typeof UpdateEmployeeDTO>

export const GetEmployeesQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetEmployeesQuery = z.infer<typeof GetEmployeesQuery>
