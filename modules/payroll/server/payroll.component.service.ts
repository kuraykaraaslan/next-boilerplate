import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { SalaryComponent } from './entities/salary_components.entity'
import type {
  CreateSalaryComponentDTO, UpdateSalaryComponentDTO, GetSalaryComponentsQuery,
} from './payroll.dto'
import { PAYROLL_MESSAGES } from './payroll.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

function toDecimal(v: number | undefined): string | undefined {
  return v === undefined ? undefined : String(v)
}

/** Tenant-scoped salary component (master-data) CRUD. */
export default class SalaryComponentService {
  static async list(
    tenantId: string, query: GetSalaryComponentsQuery,
  ): Promise<{ data: SalaryComponent[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SalaryComponent)
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

  static async getById(tenantId: string, componentId: string): Promise<SalaryComponent> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(SalaryComponent).findOne({ where: { tenantId, componentId } })
    if (!row) throw new AppError(PAYROLL_MESSAGES.COMPONENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateSalaryComponentDTO): Promise<SalaryComponent> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SalaryComponent)
    try {
      return await repo.save(repo.create({
        tenantId,
        name: data.name,
        type: data.type,
        employeeId: data.employeeId,
        amount: toDecimal(data.amount),
      }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[SalaryComponentService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(PAYROLL_MESSAGES.COMPONENT_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(
    tenantId: string, componentId: string, data: UpdateSalaryComponentDTO,
  ): Promise<SalaryComponent> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SalaryComponent)
    const row = await repo.findOne({ where: { tenantId, componentId } })
    if (!row) throw new AppError(PAYROLL_MESSAGES.COMPONENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (data.name !== undefined) row.name = data.name
    if (data.type !== undefined) row.type = data.type
    if (data.employeeId !== undefined) row.employeeId = data.employeeId
    if (data.amount !== undefined) row.amount = toDecimal(data.amount)
    return await repo.save(row)
  }

  static async delete(tenantId: string, componentId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SalaryComponent)
    const row = await repo.findOne({ where: { tenantId, componentId } })
    if (!row) throw new AppError(PAYROLL_MESSAGES.COMPONENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
