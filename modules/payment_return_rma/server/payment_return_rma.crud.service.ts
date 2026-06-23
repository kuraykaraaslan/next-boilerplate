import 'reflect-metadata'
import { ILike } from 'typeorm'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'
import { PaymentSellService } from '@kuraykaraaslan/payment_sell'
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service'
import { AuditActions } from '@kuraykaraaslan/audit_log/server/audit_log.enums'
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
import PaymentReturnRmaPolicyService from './payment_return_rma.policy.service'
import type { DataSource } from 'typeorm'

export const TERMINAL_STATUSES: ReadonlySet<ReturnStatus> = new Set(['COMPLETED', 'CANCELLED', 'REJECTED'])

export default class PaymentReturnRmaCrudService {

  static async create(tenantId: string, dto: CreateReturnDTO): Promise<ReturnRequestWithItems> {
    const ds = await tenantDataSourceFor(tenantId)
    const policy = await PaymentReturnRmaPolicyService.getPolicy(tenantId)
    // Eligibility: return window + exchange policy (no-op when purchase date unknown).
    PaymentReturnRmaPolicyService.assertEligible(policy, { type: dto.type, purchasedAt: dto.purchasedAt })
    const autoApprove = PaymentReturnRmaPolicyService.shouldAutoApprove(policy, dto.items.map((i) => i.condition))
    try {
      const savedRequestId = await ds.transaction(async (mgr) => {
        const requestRepo = mgr.getRepository(ReturnRequestEntity)
        const itemRepo = mgr.getRepository(ReturnItemEntity)
        // Gap-free, prefixed, sequential RMA number under an advisory lock.
        const rmaNumber = await PaymentReturnRmaPolicyService.allocateRmaNumber(mgr, tenantId, policy.rmaPrefix, policy.rmaPadding)
        const request = requestRepo.create({
          tenantId, orderId: dto.orderId, paymentId: dto.paymentId, userId: dto.userId,
          rmaNumber, type: dto.type, status: autoApprove ? 'APPROVED' : 'REQUESTED', reason: dto.reason,
          customerNote: dto.customerNote, currency: dto.currency, metadata: dto.metadata,
          slaDueAt: PaymentReturnRmaPolicyService.slaDueAt(policy),
          approvedAt: autoApprove ? new Date() : undefined,
        })
        const savedRequest = await requestRepo.save(request)
        const items = dto.items.map((item) => itemRepo.create({
          tenantId, returnRequestId: savedRequest.returnRequestId,
          orderItemId: item.orderItemId, productId: item.productId, variantId: item.variantId,
          sku: item.sku, name: item.name, quantity: item.quantity,
          unitPrice: item.unitPrice ?? 0, amount: Number(item.quantity) * Number(item.unitPrice ?? 0),
          reason: item.reason, condition: item.condition,
        }))
        await itemRepo.save(items)
        await PaymentReturnRmaCrudService.logEvent(ds, tenantId, savedRequest.returnRequestId, 'REQUESTED')
        if (autoApprove) await PaymentReturnRmaCrudService.logEvent(ds, tenantId, savedRequest.returnRequestId, 'APPROVED', 'Auto-approved by policy')
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
    if (query.search) where['rmaNumber'] = ILike(`%${query.search}%`)
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

  /**
   * GDPR / data-retention sweep: for terminal returns older than `keepDays`,
   * pseudonymise customer PII (userId, customerNote, customs data) while keeping
   * the financial record; hard-delete after `deleteAfterDays` (0 = never).
   * Returns counts. Intended for a scheduled job.
   */
  static async purgeOldReturns(tenantId: string, opts: { keepDays?: number; deleteAfterDays?: number } = {}): Promise<{ anonymized: number; deleted: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ReturnRequestEntity)
    const now = Date.now()
    const keepDays = opts.keepDays ?? 365
    const terminal = ['COMPLETED', 'CANCELLED', 'REJECTED', 'REFUNDED']

    const rows = await repo.find({ where: { tenantId } })
    let anonymized = 0
    let deleted = 0
    for (const r of rows) {
      if (!terminal.includes(r.status)) continue
      const ageDays = (now - new Date(r.updatedAt).getTime()) / 86_400_000
      if (opts.deleteAfterDays && opts.deleteAfterDays > 0 && ageDays > opts.deleteAfterDays) {
        await repo.remove(r); deleted += 1; continue
      }
      if (ageDays > keepDays && (r.userId || r.customerNote || r.customsData)) {
        await repo.update({ returnRequestId: r.returnRequestId }, { userId: null as never, customerNote: null as never, customsData: null as never })
        anonymized += 1
      }
    }
    return { anonymized, deleted }
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
