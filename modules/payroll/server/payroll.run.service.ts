import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { PayrollRun } from './entities/payroll_runs.entity'
import type { CreatePayrollRunDTO, UpdatePayrollRunDTO, GetPayrollRunsQuery } from './payroll.dto'
import { PAYROLL_MESSAGES } from './payroll.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped payroll run CRUD. */
export default class PayrollRunService {
  static async list(tenantId: string, query: GetPayrollRunsQuery): Promise<{ data: PayrollRun[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PayrollRun)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['period'] = ILike(`%${query.search}%`)
    const [data, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, runId: string): Promise<PayrollRun> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(PayrollRun).findOne({ where: { tenantId, runId } })
    if (!row) throw new AppError(PAYROLL_MESSAGES.RUN_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreatePayrollRunDTO): Promise<PayrollRun> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PayrollRun)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[PayrollRunService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(PAYROLL_MESSAGES.RUN_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, runId: string, data: UpdatePayrollRunDTO): Promise<PayrollRun> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PayrollRun)
    const row = await repo.findOne({ where: { tenantId, runId } })
    if (!row) throw new AppError(PAYROLL_MESSAGES.RUN_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return await repo.save(row)
  }

  static async delete(tenantId: string, runId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PayrollRun)
    const row = await repo.findOne({ where: { tenantId, runId } })
    if (!row) throw new AppError(PAYROLL_MESSAGES.RUN_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }

  private static async transition(
    tenantId: string, runId: string, from: string[], to: string,
  ): Promise<PayrollRun> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PayrollRun)
    const row = await repo.findOne({ where: { tenantId, runId } })
    if (!row) throw new AppError(PAYROLL_MESSAGES.RUN_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (!from.includes(row.status)) {
      throw new AppError(PAYROLL_MESSAGES.RUN_INVALID_TRANSITION, 400, ErrorCode.VALIDATION_ERROR)
    }
    row.status = to
    return await repo.save(row)
  }

  /** DRAFT -> PROCESSED */
  static process(tenantId: string, runId: string): Promise<PayrollRun> {
    return this.transition(tenantId, runId, ['DRAFT'], 'PROCESSED')
  }

  /** PROCESSED -> PAID */
  static pay(tenantId: string, runId: string): Promise<PayrollRun> {
    return this.transition(tenantId, runId, ['PROCESSED'], 'PAID')
  }
}
