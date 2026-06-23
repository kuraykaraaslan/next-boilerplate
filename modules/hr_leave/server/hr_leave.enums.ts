import { z } from 'zod'

export const LeaveTypeEnum = z.enum(['ANNUAL', 'SICK', 'UNPAID'])
export type LeaveType = z.infer<typeof LeaveTypeEnum>

export const LeaveStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED'])
export type LeaveStatus = z.infer<typeof LeaveStatusEnum>
