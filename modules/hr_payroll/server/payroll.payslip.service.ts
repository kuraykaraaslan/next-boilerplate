import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { Payslip } from './entities/payslips.entity'
import type { CreatePayslipDTO, UpdatePayslipDTO, GetPayslipsQuery } from './payroll.dto'
import { PAYROLL_MESSAGES } from './payroll.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'
import { recomputePayslipTotals } from './payroll.line.service'

function toDecimal(v: number | undefined): string | undefined {
  return v === undefined ? undefined : String(v)
}

/** Tenant-scoped payslip CRUD. */
export default class PayslipService {
  static async list(tenantId: string, query: GetPayslipsQuery): Promise<{ data: Payslip[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Payslip)
    const where: Record<string, unknown> = { tenantId }
    if (query.runId) where['runId'] = query.runId
    const [data, total] = await repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, payslipId: string): Promise<Payslip> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(Payslip).findOne({ where: { tenantId, payslipId } })
    if (!row) throw new AppError(PAYROLL_MESSAGES.PAYSLIP_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreatePayslipDTO): Promise<Payslip> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Payslip)
    try {
      return await repo.save(repo.create({
        tenantId,
        runId: data.runId,
        employeeId: data.employeeId,
        status: data.status,
        gross: toDecimal(data.gross),
        deductions: toDecimal(data.deductions),
        net: toDecimal(data.net),
      }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[PayslipService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(PAYROLL_MESSAGES.PAYSLIP_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, payslipId: string, data: UpdatePayslipDTO): Promise<Payslip> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Payslip)
    const row = await repo.findOne({ where: { tenantId, payslipId } })
    if (!row) throw new AppError(PAYROLL_MESSAGES.PAYSLIP_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (data.runId !== undefined) row.runId = data.runId
    if (data.employeeId !== undefined) row.employeeId = data.employeeId
    if (data.status !== undefined) row.status = data.status
    if (data.gross !== undefined) row.gross = toDecimal(data.gross)
    if (data.deductions !== undefined) row.deductions = toDecimal(data.deductions)
    if (data.net !== undefined) row.net = toDecimal(data.net)
    return await repo.save(row)
  }

  static async delete(tenantId: string, payslipId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Payslip)
    const row = await repo.findOne({ where: { tenantId, payslipId } })
    if (!row) throw new AppError(PAYROLL_MESSAGES.PAYSLIP_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
  }

  /** Recompute and persist gross/deductions/net from line items, then return the payslip. */
  static async recompute(tenantId: string, payslipId: string): Promise<Payslip> {
    const ds = await tenantDataSourceFor(tenantId)
    return recomputePayslipTotals(ds, tenantId, payslipId)
  }

  /** Apply a status transition, asserting the current status is allowed. */
  private static async transition(
    tenantId: string, payslipId: string, from: string[], to: string,
  ): Promise<Payslip> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Payslip)
    const row = await repo.findOne({ where: { tenantId, payslipId } })
    if (!row) throw new AppError(PAYROLL_MESSAGES.PAYSLIP_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (!from.includes(row.status)) {
      throw new AppError(PAYROLL_MESSAGES.PAYSLIP_INVALID_TRANSITION, 400, ErrorCode.VALIDATION_ERROR)
    }
    await recomputePayslipTotals(ds, tenantId, payslipId)
    row.status = to
    return await repo.save(row)
  }

  /** DRAFT -> ISSUED */
  static issue(tenantId: string, payslipId: string): Promise<Payslip> {
    return this.transition(tenantId, payslipId, ['DRAFT'], 'ISSUED')
  }

  /** ISSUED -> PAID */
  static pay(tenantId: string, payslipId: string): Promise<Payslip> {
    return this.transition(tenantId, payslipId, ['ISSUED'], 'PAID')
  }
}
