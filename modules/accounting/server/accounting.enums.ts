import { z } from 'zod'

export const AccountTypeEnum = z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'])
export type AccountType = z.infer<typeof AccountTypeEnum>

export const JournalEntryStatusEnum = z.enum(['DRAFT', 'POSTED', 'VOID'])
export type JournalEntryStatus = z.infer<typeof JournalEntryStatusEnum>

export const JournalTypeEnum = z.enum(['SALE', 'PURCHASE', 'BANK', 'CASH', 'MISC'])
export type JournalType = z.infer<typeof JournalTypeEnum>
