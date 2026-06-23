import { z } from 'zod'

export const PayrollRunStatusEnum = z.enum(['DRAFT', 'PROCESSED', 'PAID'])
export type PayrollRunStatus = z.infer<typeof PayrollRunStatusEnum>

export const PayslipStatusEnum = z.enum(['DRAFT', 'ISSUED', 'PAID'])
export type PayslipStatus = z.infer<typeof PayslipStatusEnum>

export const SalaryComponentTypeEnum = z.enum(['EARNING', 'DEDUCTION'])
export type SalaryComponentType = z.infer<typeof SalaryComponentTypeEnum>
