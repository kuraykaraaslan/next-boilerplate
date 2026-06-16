import { z } from 'zod'

export const ReviewStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SPAM'])
export type ReviewStatus = z.infer<typeof ReviewStatusEnum>
