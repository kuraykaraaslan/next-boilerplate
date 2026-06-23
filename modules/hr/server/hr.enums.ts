import { z } from 'zod'

export const EmployeeStatusEnum = z.enum(['ACTIVE', 'ONLEAVE', 'TERMINATED'])
export type EmployeeStatus = z.infer<typeof EmployeeStatusEnum>

export const LeaveTypeEnum = z.enum(['ANNUAL', 'SICK', 'UNPAID'])
export type LeaveType = z.infer<typeof LeaveTypeEnum>

export const LeaveStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED'])
export type LeaveStatus = z.infer<typeof LeaveStatusEnum>
