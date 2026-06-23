import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { Journal } from './entities/journals.entity'
import type { CreateJournalDTO, UpdateJournalDTO, GetJournalsQuery } from './accounting.dto'
import { ACCOUNTING_MESSAGES } from './accounting.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped journal (configurable master-data) CRUD. */
export default class JournalService {
  static async list(tenantId: string, query: GetJournalsQuery): Promise<{ data: Journal[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Journal)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [data, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, journalId: string): Promise<Journal> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(Journal).findOne({ where: { tenantId, journalId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.JOURNAL_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateJournalDTO): Promise<Journal> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Journal)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      Logger.error(`[JournalService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(ACCOUNTING_MESSAGES.JOURNAL_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, journalId: string, data: UpdateJournalDTO): Promise<Journal> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Journal)
    const row = await repo.findOne({ where: { tenantId, journalId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.JOURNAL_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return await repo.save(row)
  }

  static async delete(tenantId: string, journalId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Journal)
    const row = await repo.findOne({ where: { tenantId, journalId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.JOURNAL_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
