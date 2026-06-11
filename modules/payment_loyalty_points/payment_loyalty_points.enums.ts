import { z } from 'zod'

export const LoyaltyTransactionTypeEnum = z.enum(['EARN', 'REDEEM', 'EXPIRE', 'ADJUST', 'REVOKE'])
export type LoyaltyTransactionType = z.infer<typeof LoyaltyTransactionTypeEnum>
