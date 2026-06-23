import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { Department } from './entities/departments.entity'
import type { CreateDepartmentDTO, UpdateDepartmentDTO, GetDepartmentsQuery } from './hr.dto'
import { HR_MESSAGES } from './hr.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped department CRUD. */
export default class DepartmentService {
  static async list(tenantId: string, query: GetDepartmentsQuery): Promise<{ data: Department[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [data, total] = await ds.getRepository(Department).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, departmentId: string): Promise<Department> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(Department).findOne({ where: { tenantId, departmentId } })
    if (!row) throw new AppError(HR_MESSAGES.DEPARTMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateDepartmentDTO): Promise<Department> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Department)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[DepartmentService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(HR_MESSAGES.DEPARTMENT_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, departmentId: string, data: UpdateDepartmentDTO): Promise<Department> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Department)
    const row = await repo.findOne({ where: { tenantId, departmentId } })
    if (!row) throw new AppError(HR_MESSAGES.DEPARTMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return repo.save(row)
  }

  static async delete(tenantId: string, departmentId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(Department)
    const row = await repo.findOne({ where: { tenantId, departmentId } })
    if (!row) throw new AppError(HR_MESSAGES.DEPARTMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
