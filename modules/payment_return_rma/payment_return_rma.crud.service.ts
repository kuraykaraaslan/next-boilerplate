import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { tenantDataSourceFor } from '@/modules/db'
import Logger from '@/modules/logger'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { PaymentSellService } from '@/modules/payment_sell'
import AuditLogService from '@/modules/audit_log/audit_log.service'
import { AuditActions } from '@/modules/audit_log/audit_log.enums'
import { ReturnRequest as ReturnRequestEntity } from './entities/return_request.entity'
import { ReturnItem as ReturnItemEntity } from './entities/return_item.entity'
import { ReturnEvent as ReturnEventEntity } from './entities/return_event.entity'
import {
  SafeReturnRequestSchema, ReturnEventSchema, ReturnRequestWithItemsSchema,
  type SafeReturnRequest, type ReturnEvent, type ReturnRequestWithItems,
} from './payment_return_rma.types'
import type {
  CreateReturnDTO, UpdateReturnDTO, GetReturnsQuery,
  ModerateReturnDTO, RefundReturnDTO,
} from './payment_return_rma.dto'
import type { ReturnStatus } from './payment_return_rma.enums'
import { PAYMENT_RETURN_RMA_MESSAGES } from './payment_return_rma.messages'
import type { DataSource } from 'typeorm'

export const TERMINAL_STATUSES: ReadonlySet<ReturnStatus> = new Set(['COMPLETED', 'CANCELLED', 'REJECTED'])

export default class PaymentReturnRmaCrudService {

  static async create(tenantId: string, dto: CreateReturnDTO): Promise<ReturnRequestWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    try {
      const savedRequestId = await ds.transaction(async (mgr) => {
        const requestRepo = mgr.getRepository(ReturnRequestEntity)
        const itemRepo = mgr.getRepository(ReturnItemEntity)
        const rmaNumber = `RMA-${randomUUID().slice(0, 8).toUpperCase()}`
        const request = requestRepo.create({
          tenantId, orderId: dto.orderId, paymentId: dto.paymentId, userId: dto.userId,
          rmaNumber, type: dto.type, status: 'REQUESTED', reason: dto.reason,
          customerNote: dto.customerNote, currency: dto.currency, metadata: dto.metadata,
        })
        const savedRequest = await requestRepo.save(request)
        const items = dto.items.map((item) => itemRepo.create({
          tenantId, returnRequestId: savedRequest.returnRequestId,
          orderItemId: item.orderItemId, productId: item.productId, variantId: item.variantId,
          sku: item.sku, name: item.name, quantity: item.quantity, reason: item.reason, condition: item.condition,
        }))
        await itemRepo.save(items)
        await PaymentReturnRmaCrudService.logEvent(ds, tenantId, savedRequest.returnRequestId, 'REQUESTED')
        return savedRequest.returnRequestId
      })
      return PaymentReturnRmaCrudService.getById(tenantId, savedRequestId)
    } catch (err) {
      if (err instanceof AppError) throw err
      Logger.error(`${PAYMENT_RETURN_RMA_MESSAGES.RETURN_CREATE_FAILED}: ${err}`)
      throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.RETURN_CREATE_FAILED, 502, ErrorCode.INTERNAL_ERROR)
    }
  }

  static async getById(tenantId: string, returnRequestId: string): Promise<ReturnRequestWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const request = await ds.getRepository(ReturnRequestEntity).findOne({ where: { tenantId, returnRequestId } })
    if (!request) throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.RETURN_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const items = await ds.getRepository(ReturnItemEntity).find({ where: { tenantId, returnRequestId }, order: { createdAt: 'ASC' } })
    const events = await ds.getRepository(ReturnEventEntity).find({ where: { tenantId, returnRequestId }, order: { createdAt: 'ASC' } })
    return ReturnRequestWithItemsSchema.parse({ ...request, items, events })
  }

  static async list(tenantId: string, query: GetReturnsQuery): Promise<{ data: SafeReturnRequest[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ReturnRequestEntity)
    const where: Record<string, unknown> = { tenantId }
    if (query.orderId) where['orderId'] = query.orderId
    if (query.userId) where['userId'] = query.userId
    if (query.status) where['status'] = query.status
    if (query.type) where['type'] = query.type
    if (query.rmaNumber) where['rmaNumber'] = query.rmaNumber
    const [rows, total] = await repo.findAndCount({
      where, order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize, take: query.pageSize,
    })
    return { data: rows.map((r) => SafeReturnRequestSchema.parse(r)), total }
  }

  static async update(tenantId: string, returnRequestId: string, dto: UpdateReturnDTO): Promise<ReturnRequestWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ReturnRequestEntity)
    const row = await repo.findOne({ where: { tenantId, returnRequestId } })
    if (!row) throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.RETURN_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, dto)
    await repo.save(row)
    return PaymentReturnRmaCrudService.getById(tenantId, returnRequestId)
  }

  static async loadMutable(
    tenantId: string, returnRequestId: string,
  ): Promise<{ ds: DataSource; row: ReturnRequestEntity }> {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(ReturnRequestEntity).findOne({ where: { tenantId, returnRequestId } })
    if (!row) throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.RETURN_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    if (TERMINAL_STATUSES.has(row.status as ReturnStatus)) {
      throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.INVALID_STATUS_TRANSITION, 409, ErrorCode.CONFLICT)
    }
    return { ds, row }
  }

  static async logEvent(
    ds: DataSource, tenantId: string, returnRequestId: string, status: ReturnStatus, message?: string,
  ): Promise<void> {
    try {
      const repo = ds.getRepository(ReturnEventEntity)
      await repo.save(repo.create({ tenantId, returnRequestId, status, message }))
    } catch (error) {
      Logger.error(`${PAYMENT_RETURN_RMA_MESSAGES.EVENT_LOG_FAILED}: ${error}`)
    }
  }
}
