import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { LeaveType } from './entities/leave_types.entity'
import type { CreateLeaveTypeDTO, UpdateLeaveTypeDTO, GetLeaveTypesQuery } from './hr_leave.dto'
import { HR_LEAVE_MESSAGES } from './hr_leave.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped leave type CRUD (configurable master-data). */
export default class LeaveTypeService {
  static async list(tenantId: string, query: GetLeaveTypesQuery): Promise<{ data: LeaveType[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.search) where['name'] = ILike(`%${query.search}%`)
    const [data, total] = await ds.getRepository(LeaveType).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, leaveTypeId: string): Promise<LeaveType> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(LeaveType).findOne({ where: { tenantId, leaveTypeId } })
    if (!row) throw new AppError(HR_LEAVE_MESSAGES.LEAVE_TYPE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateLeaveTypeDTO): Promise<LeaveType> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(LeaveType)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[LeaveTypeService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(HR_LEAVE_MESSAGES.LEAVE_TYPE_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, leaveTypeId: string, data: UpdateLeaveTypeDTO): Promise<LeaveType> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(LeaveType)
    const row = await repo.findOne({ where: { tenantId, leaveTypeId } })
    if (!row) throw new AppError(HR_LEAVE_MESSAGES.LEAVE_TYPE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return repo.save(row)
  }

  static async delete(tenantId: string, leaveTypeId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(LeaveType)
    const row = await repo.findOne({ where: { tenantId, leaveTypeId } })
    if (!row) throw new AppError(HR_LEAVE_MESSAGES.LEAVE_TYPE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }
}
