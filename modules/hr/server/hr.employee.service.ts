import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { Employee } from './entities/employees.entity'
import type { CreateEmployeeDTO, UpdateEmployeeDTO, GetEmployeesQuery } from './hr.dto'
import { HR_MESSAGES } from './hr.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped employee CRUD. */
export default class EmployeeService {
  static async list(tenantId: string, query: GetEmployeesQuery): Promise<{ data: Employee[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['email'] = ILike(`%${query.search}%`)
    const [data, total] = await ds.getRepository(Employee).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, employeeId: string): Promise<Employee> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(Employee).findOne({ where: { tenantId, employeeId } })
    if (!row) throw new AppError(HR_MESSAGES.EMPLOYEE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateEmployeeDTO): Promise<Employee> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Employee)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[EmployeeService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(HR_MESSAGES.EMPLOYEE_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, employeeId: string, data: UpdateEmployeeDTO): Promise<Employee> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Employee)
    const row = await repo.findOne({ where: { tenantId, employeeId } })
    if (!row) throw new AppError(HR_MESSAGES.EMPLOYEE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return repo.save(row)
  }

  static async delete(tenantId: string, employeeId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Employee)
    const row = await repo.findOne({ where: { tenantId, employeeId } })
    if (!row) throw new AppError(HR_MESSAGES.EMPLOYEE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
