import { z } from 'zod'
import { EmployeeStatusEnum, LeaveTypeEnum, LeaveStatusEnum } from './hr.enums'

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

// ============================================================================
// LeaveRequest DTOs
// ============================================================================

export const CreateLeaveRequestDTO = z.object({
  employeeId: z.string().uuid(),
  type: LeaveTypeEnum.default('ANNUAL'),
  leaveTypeId: z.string().uuid().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: LeaveStatusEnum.default('PENDING'),
  reason: z.string().optional(),
})
export type CreateLeaveRequestDTO = z.infer<typeof CreateLeaveRequestDTO>

export const UpdateLeaveRequestDTO = CreateLeaveRequestDTO.partial()
export type UpdateLeaveRequestDTO = z.infer<typeof UpdateLeaveRequestDTO>

export const GetLeaveRequestsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  employeeId: z.string().uuid().optional(),
})
export type GetLeaveRequestsQuery = z.infer<typeof GetLeaveRequestsQuery>

// ============================================================================
// LeaveType DTOs (configurable master-data)
// ============================================================================

export const CreateLeaveTypeDTO = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  paid: z.boolean().optional().default(false),
  maxDaysPerYear: z.coerce.number().int().nonnegative().optional().default(0),
  color: z.string().optional(),
})
export type CreateLeaveTypeDTO = z.infer<typeof CreateLeaveTypeDTO>

export const UpdateLeaveTypeDTO = CreateLeaveTypeDTO.partial()
export type UpdateLeaveTypeDTO = z.infer<typeof UpdateLeaveTypeDTO>

export const GetLeaveTypesQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetLeaveTypesQuery = z.infer<typeof GetLeaveTypesQuery>
