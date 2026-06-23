import { z } from 'zod'

export const EmployeeStatusEnum = z.enum(['ACTIVE', 'ONLEAVE', 'TERMINATED'])
export type EmployeeStatus = z.infer<typeof EmployeeStatusEnum>
