import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { FiscalPeriod } from './entities/fiscal_periods.entity'
import type { CreateFiscalPeriodDTO, UpdateFiscalPeriodDTO, GetFiscalPeriodsQuery } from './accounting.dto'
import { ACCOUNTING_MESSAGES } from './accounting.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped fiscal-period CRUD. */
export default class FiscalPeriodService {
  static async list(tenantId: string, query: GetFiscalPeriodsQuery): Promise<{ data: FiscalPeriod[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FiscalPeriod)
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

  static async getById(tenantId: string, periodId: string): Promise<FiscalPeriod> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(FiscalPeriod).findOne({ where: { tenantId, periodId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.PERIOD_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateFiscalPeriodDTO): Promise<FiscalPeriod> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FiscalPeriod)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      Logger.error(`[FiscalPeriodService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(ACCOUNTING_MESSAGES.PERIOD_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, periodId: string, data: UpdateFiscalPeriodDTO): Promise<FiscalPeriod> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FiscalPeriod)
    const row = await repo.findOne({ where: { tenantId, periodId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.PERIOD_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return await repo.save(row)
  }

  static async delete(tenantId: string, periodId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(FiscalPeriod)
    const row = await repo.findOne({ where: { tenantId, periodId } })
    if (!row) throw new AppError(ACCOUNTING_MESSAGES.PERIOD_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
  }
}
