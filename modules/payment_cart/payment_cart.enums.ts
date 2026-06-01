import { z } from 'zod'

export const CartStatusEnum = z.enum(['ACTIVE', 'CONVERTED', 'ABANDONED', 'MERGED'])
export type CartStatus = z.infer<typeof CartStatusEnum>
