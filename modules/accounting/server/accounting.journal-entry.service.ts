import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { JournalEntry } from './entities/journal_entries.entity'
import type { CreateJournalEntryDTO, UpdateJournalEntryDTO, GetJournalEntriesQuery } from './accounting.dto'
import { ACCOUNTING_MESSAGES } from './accounting.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'
import { recomputeEntryTotals } from './accounting.ledger-line.service'

/** Tenant-scoped journal-entry CRUD. */
export default class JournalEntryService {
  static async list(tenantId: string, query: GetJournalEntriesQuery): Promise<{ data: JournalEntry[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(JournalEntry)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['number'] = ILike(`%${query.search}%`)
    const [data, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, entryId: string): Promise<JournalEntry> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(JournalEntry).findOne({ where: { tenantId, entryId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.ENTRY_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateJournalEntryDTO): Promise<JournalEntry> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(JournalEntry)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      Logger.error(`[JournalEntryService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(ACCOUNTING_MESSAGES.ENTRY_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, entryId: string, data: UpdateJournalEntryDTO): Promise<JournalEntry> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(JournalEntry)
    const row = await repo.findOne({ where: { tenantId, entryId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.ENTRY_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    await repo.save(row)
    // Keep computed totals in sync on every document save.
    return await recomputeEntryTotals(ds, tenantId, entryId)
  }

  static async delete(tenantId: string, entryId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(JournalEntry)
    const row = await repo.findOne({ where: { tenantId, entryId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.ENTRY_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }

  // ==========================================================================
  // Status workflow: DRAFT -> POSTED (requires balanced & totalDebit>0) -> VOID
  // ==========================================================================

  /** Post a DRAFT entry: recompute, assert balanced & totalDebit>0, set POSTED. */
  static async post(tenantId: string, entryId: string): Promise<JournalEntry> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(JournalEntry)
    const row = await repo.findOne({ where: { tenantId, entryId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.ENTRY_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (row.status !== 'DRAFT') throw new AppError(ACCOUNTING_MESSAGES.INVALID_TRANSITION, 400, ErrorCode.VALIDATION_ERROR)
    const synced = await recomputeEntryTotals(ds, tenantId, entryId)
    const totalDebit = Number(synced.totalDebit)
    const totalCredit = Number(synced.totalCredit)
    if (!(totalDebit === totalCredit && totalDebit > 0)) {
      throw new AppError(ACCOUNTING_MESSAGES.NOT_BALANCED, 400, ErrorCode.VALIDATION_ERROR)
    }
    synced.status = 'POSTED'
    synced.postedAt = new Date()
    return await repo.save(synced)
  }

  /** Reset a POSTED entry to VOID. */
  static async void(tenantId: string, entryId: string): Promise<JournalEntry> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(JournalEntry)
    const row = await repo.findOne({ where: { tenantId, entryId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.ENTRY_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (row.status !== 'POSTED') throw new AppError(ACCOUNTING_MESSAGES.INVALID_TRANSITION, 400, ErrorCode.VALIDATION_ERROR)
    row.status = 'VOID'
    return await repo.save(row)
  }
}
