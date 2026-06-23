import { z } from 'zod'
import { PayrollRunStatusEnum, PayslipStatusEnum, SalaryComponentTypeEnum } from './payroll.enums'

// ============================================================================
// PayrollRun
// ============================================================================

export const PayrollRunSchema = z.object({
  runId: z.string().uuid(),
  tenantId: z.string().uuid(),
  period: z.string(),
  status: PayrollRunStatusEnum,
  runDate: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type PayrollRun = z.infer<typeof PayrollRunSchema>

// ============================================================================
// Payslip
// ============================================================================

export const PayslipSchema = z.object({
  payslipId: z.string().uuid(),
  tenantId: z.string().uuid(),
  runId: z.string().uuid(),
  employeeId: z.string().uuid(),
  gross: z.string().nullable(),
  deductions: z.string().nullable(),
  net: z.string().nullable(),
  status: PayslipStatusEnum,
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Payslip = z.infer<typeof PayslipSchema>

// ============================================================================
// PayslipLine
// ============================================================================

export const PayslipLineSchema = z.object({
  payslipLineId: z.string().uuid(),
  tenantId: z.string().uuid(),
  payslipId: z.string().uuid(),
  name: z.string(),
  type: SalaryComponentTypeEnum,
  amount: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type PayslipLine = z.infer<typeof PayslipLineSchema>

// ============================================================================
// SalaryComponent
// ============================================================================

export const SalaryComponentSchema = z.object({
  componentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  employeeId: z.string().uuid(),
  type: SalaryComponentTypeEnum,
  name: z.string(),
  amount: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type SalaryComponent = z.infer<typeof SalaryComponentSchema>
