import 'reflect-metadata'
import type { DataSource } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { PayslipLine } from './entities/payslip_lines.entity'
import { Payslip } from './entities/payslips.entity'
import type {
  CreatePayslipLineDTO, UpdatePayslipLineDTO, GetPayslipLinesQuery,
} from './payroll.dto'
import { PAYROLL_MESSAGES } from './payroll.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

function toDecimal(v: number | undefined): string | undefined {
  return v === undefined ? undefined : String(v)
}

async function assertPayslip(ds: DataSource, tenantId: string, payslipId: string): Promise<Payslip> {
  const payslip = await ds.getRepository(Payslip).findOne({ where: { tenantId, payslipId } })
  if (!payslip) throw new AppError(PAYROLL_MESSAGES.PAYSLIP_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
  return payslip
}

/** Recompute gross/deductions/net on the parent payslip from its lines and persist. */
export async function recomputePayslipTotals(
  ds: DataSource, tenantId: string, payslipId: string,
): Promise<Payslip> {
  const payslip = await assertPayslip(ds, tenantId, payslipId)
  const lines = await ds.getRepository(PayslipLine).find({ where: { tenantId, payslipId } })
  let gross = 0
  let deductions = 0
  for (const l of lines) {
    const amt = Number(l.amount ?? 0)
    if (l.type === 'DEDUCTION') deductions += amt
    else gross += amt
  }
  const net = gross - deductions
  payslip.gross = String(gross)
  payslip.deductions = String(deductions)
  payslip.net = String(net)
  return await ds.getRepository(Payslip).save(payslip)
}

/** Tenant-scoped payslip line items, recomputing parent totals on every change. */
export default class PayslipLineService {
  static async listByParent(
    tenantId: string, payslipId: string, query: GetPayslipLinesQuery,
  ): Promise<{ data: PayslipLine[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    await assertPayslip(ds, tenantId, payslipId)
    const [data, total] = await ds.getRepository(PayslipLine).findAndCount({
      where: { tenantId, payslipId },
      order: { createdAt: 'ASC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async addLine(
    tenantId: string, payslipId: string, data: CreatePayslipLineDTO,
  ): Promise<PayslipLine> {
    const ds = await tenantDataSourceFor(tenantId)
    await assertPayslip(ds, tenantId, payslipId)
    const repo = ds.getRepository(PayslipLine)
    try {
      const line = await repo.save(repo.create({
        tenantId, payslipId,
        name: data.name, type: data.type, amount: toDecimal(data.amount),
      }))
      await recomputePayslipTotals(ds, tenantId, payslipId)
      return line
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[PayslipLineService.addLine][tenant:${tenantId}] ${error}`)
      throw new AppError(PAYROLL_MESSAGES.LINE_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async updateLine(
    tenantId: string, payslipId: string, payslipLineId: string, data: UpdatePayslipLineDTO,
  ): Promise<PayslipLine> {
    const ds = await tenantDataSourceFor(tenantId)
    await assertPayslip(ds, tenantId, payslipId)
    const repo = ds.getRepository(PayslipLine)
    const row = await repo.findOne({ where: { tenantId, payslipId, payslipLineId } })
    if (!row) throw new AppError(PAYROLL_MESSAGES.LINE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (data.name !== undefined) row.name = data.name
    if (data.type !== undefined) row.type = data.type
    if (data.amount !== undefined) row.amount = toDecimal(data.amount)
    const saved = await repo.save(row)
    await recomputePayslipTotals(ds, tenantId, payslipId)
    return saved
  }

  static async deleteLine(
    tenantId: string, payslipId: string, payslipLineId: string,
  ): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    await assertPayslip(ds, tenantId, payslipId)
    const repo = ds.getRepository(PayslipLine)
    const row = await repo.findOne({ where: { tenantId, payslipId, payslipLineId } })
    if (!row) throw new AppError(PAYROLL_MESSAGES.LINE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.remove(row)
    await recomputePayslipTotals(ds, tenantId, payslipId)
  }
}
