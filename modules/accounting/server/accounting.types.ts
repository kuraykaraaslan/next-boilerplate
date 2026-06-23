import { z } from 'zod'
import { AccountTypeEnum, JournalEntryStatusEnum, JournalTypeEnum } from './accounting.enums'

// ============================================================================
// Journal (configurable master-data)
// ============================================================================

export const JournalSchema = z.object({
  journalId: z.string().uuid(),
  tenantId: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  type: JournalTypeEnum,
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type Journal = z.infer<typeof JournalSchema>

// ============================================================================
// LedgerAccount
// ============================================================================

export const LedgerAccountSchema = z.object({
  accountId: z.string().uuid(),
  tenantId: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  type: AccountTypeEnum,
  parentId: z.string().uuid().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type LedgerAccount = z.infer<typeof LedgerAccountSchema>

// ============================================================================
// JournalEntry
// ============================================================================

export const JournalEntrySchema = z.object({
  entryId: z.string().uuid(),
  tenantId: z.string().uuid(),
  journalId: z.string().uuid().nullable(),
  number: z.string(),
  description: z.string().nullable(),
  status: JournalEntryStatusEnum,
  totalDebit: z.number(),
  totalCredit: z.number(),
  entryDate: z.date(),
  postedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type JournalEntry = z.infer<typeof JournalEntrySchema>

// ============================================================================
// JournalLine
// ============================================================================

export const JournalLineSchema = z.object({
  lineId: z.string().uuid(),
  tenantId: z.string().uuid(),
  entryId: z.string().uuid(),
  accountId: z.string().uuid(),
  debit: z.number().nullable(),
  credit: z.number().nullable(),
  memo: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type JournalLine = z.infer<typeof JournalLineSchema>

// ============================================================================
// FiscalPeriod
// ============================================================================

export const FiscalPeriodSchema = z.object({
  periodId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  status: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type FiscalPeriod = z.infer<typeof FiscalPeriodSchema>
