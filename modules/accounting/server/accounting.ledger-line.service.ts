import 'reflect-metadata'
import type { DataSource } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { JournalLine } from './entities/journal_lines.entity'
import { JournalEntry } from './entities/journal_entries.entity'
import type { GetJournalLinesQuery, CreateJournalLineDTO, UpdateJournalLineDTO } from './accounting.dto'
import { ACCOUNTING_MESSAGES } from './accounting.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Recompute totalDebit/totalCredit on the parent entry from its lines. */
export async function recomputeEntryTotals(ds: DataSource, tenantId: string, entryId: string): Promise<JournalEntry> {
  const entryRepo = ds.getRepository(JournalEntry)
  const entry = await entryRepo.findOne({ where: { tenantId, entryId } })
  if (!entry) throw new AppError(ACCOUNTING_MESSAGES.ENTRY_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
  const lines = await ds.getRepository(JournalLine).find({ where: { tenantId, entryId } })
  let totalDebit = 0
  let totalCredit = 0
  for (const l of lines) {
    totalDebit += Number(l.debit ?? 0)
    totalCredit += Number(l.credit ?? 0)
  }
  entry.totalDebit = Math.round(totalDebit * 100) / 100
  entry.totalCredit = Math.round(totalCredit * 100) / 100
  return await entryRepo.save(entry)
}

/** Tenant-scoped journal-line (ledger) CRUD scoped to a parent entry. */
export default class JournalLineService {
  /** Flat read across all lines (ledger view). */
  static async list(tenantId: string, query: GetJournalLinesQuery): Promise<{ data: JournalLine[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(JournalLine)
    const [data, total] = await repo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, lineId: string): Promise<JournalLine> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(JournalLine).findOne({ where: { tenantId, lineId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.LINE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async listByParent(tenantId: string, entryId: string): Promise<{ data: JournalLine[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const [data, total] = await ds.getRepository(JournalLine).findAndCount({
      where: { tenantId, entryId },
      order: { createdAt: 'ASC' },
    })
    return { data, total }
  }

  static async addLine(tenantId: string, entryId: string, data: CreateJournalLineDTO): Promise<JournalLine> {
    const ds = await tenantDataSourceFor(tenantId)
    const entry = await ds.getRepository(JournalEntry).findOne({ where: { tenantId, entryId } })
    if (!entry) throw new AppError(ACCOUNTING_MESSAGES.ENTRY_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const repo = ds.getRepository(JournalLine)
    let row: JournalLine
    try {
      row = await repo.save(repo.create({ tenantId, entryId, ...data }))
    } catch (error) {
      Logger.error(`[JournalLineService.addLine][tenant:${tenantId}] ${error}`)
      throw new AppError(ACCOUNTING_MESSAGES.LINE_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
    await recomputeEntryTotals(ds, tenantId, entryId)
    return row
  }

  static async updateLine(tenantId: string, entryId: string, lineId: string, data: UpdateJournalLineDTO): Promise<JournalLine> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(JournalLine)
    const row = await repo.findOne({ where: { tenantId, entryId, lineId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.LINE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    const saved = await repo.save(row)
    await recomputeEntryTotals(ds, tenantId, entryId)
    return saved
  }

  static async deleteLine(tenantId: string, entryId: string, lineId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(JournalLine)
    const row = await repo.findOne({ where: { tenantId, entryId, lineId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.LINE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
    await recomputeEntryTotals(ds, tenantId, entryId)
  }
}
