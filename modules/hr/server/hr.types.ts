import { z } from 'zod'
import { EmployeeStatusEnum } from './hr.enums'

// ============================================================================
// Department
// ============================================================================

export const DepartmentSchema = z.object({
  departmentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  managerId: z.string().uuid().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type Department = z.infer<typeof DepartmentSchema>

// ============================================================================
// Employee
// ============================================================================

export const EmployeeSchema = z.object({
  employeeId: z.string().uuid(),
  tenantId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  departmentId: z.string().uuid().nullable(),
  title: z.string().nullable(),
  status: EmployeeStatusEnum,
  hiredAt: z.date().nullable(),
  userId: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type Employee = z.infer<typeof EmployeeSchema>
