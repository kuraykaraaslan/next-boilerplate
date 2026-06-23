import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { LeaveRequest } from './entities/leave_requests.entity'
import type { CreateLeaveRequestDTO, UpdateLeaveRequestDTO, GetLeaveRequestsQuery } from './hr_leave.dto'
import { HR_LEAVE_MESSAGES } from './hr_leave.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'

/** Tenant-scoped leave request CRUD. */
export default class LeaveRequestService {
  static async list(tenantId: string, query: GetLeaveRequestsQuery): Promise<{ data: LeaveRequest[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.employeeId) where['employeeId'] = query.employeeId
    const [data, total] = await ds.getRepository(LeaveRequest).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data, total }
  }

  static async getById(tenantId: string, leaveId: string): Promise<LeaveRequest> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(LeaveRequest).findOne({ where: { tenantId, leaveId } })
    if (!row) throw new AppError(HR_LEAVE_MESSAGES.LEAVE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return row
  }

  static async create(tenantId: string, data: CreateLeaveRequestDTO): Promise<LeaveRequest> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(LeaveRequest)
    try {
      return await repo.save(repo.create({ tenantId, ...data }))
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`[LeaveRequestService.create][tenant:${tenantId}] ${error}`)
      throw new AppError(HR_LEAVE_MESSAGES.LEAVE_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async update(tenantId: string, leaveId: string, data: UpdateLeaveRequestDTO): Promise<LeaveRequest> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(LeaveRequest)
    const row = await repo.findOne({ where: { tenantId, leaveId } })
    if (!row) throw new AppError(HR_LEAVE_MESSAGES.LEAVE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, data)
    return repo.save(row)
  }

  static async delete(tenantId: string, leaveId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(LeaveRequest)
    const row = await repo.findOne({ where: { tenantId, leaveId } })
    if (!row) throw new AppError(HR_LEAVE_MESSAGES.LEAVE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    await repo.softRemove(row)
  }

  /** Workflow transition: assert current status is allowed, then apply. */
  private static async transition(
    tenantId: string, leaveId: string, from: string[], to: string,
  ): Promise<LeaveRequest> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(LeaveRequest)
    const row = await repo.findOne({ where: { tenantId, leaveId } })
    if (!row) throw new AppError(HR_LEAVE_MESSAGES.LEAVE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (!from.includes(row.status)) {
      throw new AppError(HR_LEAVE_MESSAGES.LEAVE_INVALID_TRANSITION, 409, ErrorCode.CONFLICT)
    }
    row.status = to
    return repo.save(row)
  }

  static approve(tenantId: string, leaveId: string): Promise<LeaveRequest> {
    return this.transition(tenantId, leaveId, ['PENDING'], 'APPROVED')
  }

  static reject(tenantId: string, leaveId: string): Promise<LeaveRequest> {
    return this.transition(tenantId, leaveId, ['PENDING'], 'REJECTED')
  }
}
