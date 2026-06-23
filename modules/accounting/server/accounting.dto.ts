import { z } from 'zod'
import { AccountTypeEnum, JournalEntryStatusEnum, JournalTypeEnum } from './accounting.enums'

// ============================================================================
// Journal DTOs (configurable master-data)
// ============================================================================

export const CreateJournalDTO = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: JournalTypeEnum.optional(),
  isActive: z.boolean().optional().default(false),
})
export type CreateJournalDTO = z.infer<typeof CreateJournalDTO>

export const UpdateJournalDTO = CreateJournalDTO.partial()
export type UpdateJournalDTO = z.infer<typeof UpdateJournalDTO>

export const GetJournalsQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetJournalsQuery = z.infer<typeof GetJournalsQuery>

// ============================================================================
// LedgerAccount DTOs
// ============================================================================

export const CreateLedgerAccountDTO = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: AccountTypeEnum.optional(),
  isActive: z.boolean().optional().default(false),
})
export type CreateLedgerAccountDTO = z.infer<typeof CreateLedgerAccountDTO>

export const UpdateLedgerAccountDTO = CreateLedgerAccountDTO.partial()
export type UpdateLedgerAccountDTO = z.infer<typeof UpdateLedgerAccountDTO>

export const GetLedgerAccountsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetLedgerAccountsQuery = z.infer<typeof GetLedgerAccountsQuery>

// ============================================================================
// JournalEntry DTOs
// ============================================================================

export const CreateJournalEntryDTO = z.object({
  number: z.string().min(1),
  journalId: z.string().uuid().optional(),
  description: z.string().optional(),
  status: JournalEntryStatusEnum.optional(),
  entryDate: z.coerce.date().optional(),
})
export type CreateJournalEntryDTO = z.infer<typeof CreateJournalEntryDTO>

export const UpdateJournalEntryDTO = CreateJournalEntryDTO.partial()
export type UpdateJournalEntryDTO = z.infer<typeof UpdateJournalEntryDTO>

export const GetJournalEntriesQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetJournalEntriesQuery = z.infer<typeof GetJournalEntriesQuery>

// ============================================================================
// JournalLine DTOs (read-only ledger view)
// ============================================================================

export const GetJournalLinesQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(200).default(100),
})
export type GetJournalLinesQuery = z.infer<typeof GetJournalLinesQuery>

export const CreateJournalLineDTO = z.object({
  accountId: z.string().min(1),
  memo: z.string().optional(),
  debit: z.coerce.number().optional().default(0),
  credit: z.coerce.number().optional().default(0),
})
export type CreateJournalLineDTO = z.infer<typeof CreateJournalLineDTO>

export const UpdateJournalLineDTO = CreateJournalLineDTO.partial()
export type UpdateJournalLineDTO = z.infer<typeof UpdateJournalLineDTO>

// ============================================================================
// FiscalPeriod DTOs
// ============================================================================

export const CreateFiscalPeriodDTO = z.object({
  name: z.string().min(1),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
})
export type CreateFiscalPeriodDTO = z.infer<typeof CreateFiscalPeriodDTO>

export const UpdateFiscalPeriodDTO = CreateFiscalPeriodDTO.partial()
export type UpdateFiscalPeriodDTO = z.infer<typeof UpdateFiscalPeriodDTO>

export const GetFiscalPeriodsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetFiscalPeriodsQuery = z.infer<typeof GetFiscalPeriodsQuery>
