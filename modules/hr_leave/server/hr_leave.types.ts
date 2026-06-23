import { z } from 'zod'
import { LeaveTypeEnum, LeaveStatusEnum } from './hr_leave.enums'

// ============================================================================
// LeaveRequest
// ============================================================================

export const LeaveRequestSchema = z.object({
  leaveId: z.string().uuid(),
  tenantId: z.string().uuid(),
  employeeId: z.string().uuid(),
  type: LeaveTypeEnum,
  startDate: z.date(),
  endDate: z.date(),
  status: LeaveStatusEnum,
  reason: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type LeaveRequest = z.infer<typeof LeaveRequestSchema>
