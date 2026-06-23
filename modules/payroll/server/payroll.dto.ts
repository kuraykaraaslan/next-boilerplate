import { z } from 'zod'
import { PayrollRunStatusEnum, PayslipStatusEnum, SalaryComponentTypeEnum } from './payroll.enums'

// ============================================================================
// PayrollRun DTOs
// ============================================================================

export const CreatePayrollRunDTO = z.object({
  period: z.string().min(1),
  status: PayrollRunStatusEnum.default('DRAFT'),
  runDate: z.coerce.date().optional(),
})
export type CreatePayrollRunDTO = z.infer<typeof CreatePayrollRunDTO>

export const UpdatePayrollRunDTO = CreatePayrollRunDTO.partial()
export type UpdatePayrollRunDTO = z.infer<typeof UpdatePayrollRunDTO>

export const GetPayrollRunsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetPayrollRunsQuery = z.infer<typeof GetPayrollRunsQuery>

// ============================================================================
// Payslip DTOs
// ============================================================================

export const CreatePayslipDTO = z.object({
  runId: z.string().uuid(),
  employeeId: z.string().uuid(),
  gross: z.coerce.number().optional(),
  deductions: z.coerce.number().optional(),
  net: z.coerce.number().optional(),
  status: PayslipStatusEnum.default('DRAFT'),
})
export type CreatePayslipDTO = z.infer<typeof CreatePayslipDTO>

export const UpdatePayslipDTO = CreatePayslipDTO.partial()
export type UpdatePayslipDTO = z.infer<typeof UpdatePayslipDTO>

export const GetPayslipsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  runId: z.string().uuid().optional(),
})
export type GetPayslipsQuery = z.infer<typeof GetPayslipsQuery>

// ============================================================================
// PayslipLine DTOs
// ============================================================================

export const CreatePayslipLineDTO = z.object({
  name: z.string().min(1),
  type: SalaryComponentTypeEnum.default('EARNING'),
  amount: z.coerce.number(),
})
export type CreatePayslipLineDTO = z.infer<typeof CreatePayslipLineDTO>

export const UpdatePayslipLineDTO = CreatePayslipLineDTO.partial()
export type UpdatePayslipLineDTO = z.infer<typeof UpdatePayslipLineDTO>

export const GetPayslipLinesQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(200).default(100),
  search: z.string().optional(),
})
export type GetPayslipLinesQuery = z.infer<typeof GetPayslipLinesQuery>

// ============================================================================
// SalaryComponent DTOs
// ============================================================================

export const CreateSalaryComponentDTO = z.object({
  name: z.string().min(1),
  type: SalaryComponentTypeEnum.default('EARNING'),
  amount: z.coerce.number().optional(),
  employeeId: z.string().uuid(),
})
export type CreateSalaryComponentDTO = z.infer<typeof CreateSalaryComponentDTO>

export const UpdateSalaryComponentDTO = CreateSalaryComponentDTO.partial()
export type UpdateSalaryComponentDTO = z.infer<typeof UpdateSalaryComponentDTO>

export const GetSalaryComponentsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetSalaryComponentsQuery = z.infer<typeof GetSalaryComponentsQuery>
