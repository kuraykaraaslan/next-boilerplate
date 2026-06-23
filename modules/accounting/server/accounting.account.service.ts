import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { LedgerAccount } from './entities/ledger_accounts.entity'
import type { CreateLedgerAccountDTO, UpdateLedgerAccountDTO, GetLedgerAccountsQuery } from './accounting.dto'
import { ACCOUNTING_MESSAGES } from './accounting.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped chart-of-accounts CRUD. */
export default class LedgerAccountService {
  static async list(tenantId: string, query: GetLedgerAccountsQuery): Promise<{ data: LedgerAccount[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(LedgerAccount)
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

  static async getById(tenantId: string, accountId: string): Promise<LedgerAccount> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(LedgerAccount).findOne({ where: { tenantId, accountId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.ACCOUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateLedgerAccountDTO): Promise<LedgerAccount> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(LedgerAccount)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      Logger.error(`[LedgerAccountService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(ACCOUNTING_MESSAGES.ACCOUNT_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, accountId: string, data: UpdateLedgerAccountDTO): Promise<LedgerAccount> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(LedgerAccount)
    const row = await repo.findOne({ where: { tenantId, accountId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.ACCOUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return await repo.save(row)
  }

  static async delete(tenantId: string, accountId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(LedgerAccount)
    const row = await repo.findOne({ where: { tenantId, accountId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.ACCOUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
