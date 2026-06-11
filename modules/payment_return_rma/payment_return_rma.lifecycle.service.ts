import Logger from '@/modules/logger'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { PaymentSellService } from '@/modules/payment_sell'
import AuditLogService from '@/modules/audit_log/audit_log.service'
import { AuditActions } from '@/modules/audit_log/audit_log.enums'
import { ReturnRequest as ReturnRequestEntity } from './entities/return_request.entity'
import { ReturnEvent as ReturnEventEntity } from './entities/return_event.entity'
import { ReturnEventSchema, type ReturnEvent, type ReturnRequestWithItems } from './payment_return_rma.types'
import type { ModerateReturnDTO, RefundReturnDTO } from './payment_return_rma.dto'
import { PAYMENT_RETURN_RMA_MESSAGES } from './payment_return_rma.messages'
import PaymentReturnRmaCrudService from './payment_return_rma.crud.service'
import { tenantDataSourceFor } from '@/modules/db'

export default class PaymentReturnRmaLifecycleService {

  static async approve(tenantId: string, returnRequestId: string, dto?: ModerateReturnDTO): Promise<ReturnRequestWithItems> {
    const { ds, row } = await PaymentReturnRmaCrudService.loadMutable(tenantId, returnRequestId)
    row.status = 'APPROVED'
    if (!row.approvedAt) row.approvedAt = new Date()
    await ds.getRepository(ReturnRequestEntity).save(row)
    await PaymentReturnRmaCrudService.logEvent(ds, tenantId, returnRequestId, 'APPROVED', dto?.note)
    AuditLogService.log({ tenantId, actorType: 'SYSTEM', action: AuditActions.SETTINGS_UPDATED,
      resourceType: 'return_request', resourceId: returnRequestId,
      metadata: { status: 'APPROVED', note: dto?.note } }).catch(() => {})
    return PaymentReturnRmaCrudService.getById(tenantId, returnRequestId)
  }

  static async reject(tenantId: string, returnRequestId: string, dto?: ModerateReturnDTO): Promise<ReturnRequestWithItems> {
    const { ds, row } = await PaymentReturnRmaCrudService.loadMutable(tenantId, returnRequestId)
    row.status = 'REJECTED'
    await ds.getRepository(ReturnRequestEntity).save(row)
    await PaymentReturnRmaCrudService.logEvent(ds, tenantId, returnRequestId, 'REJECTED', dto?.note)
    AuditLogService.log({ tenantId, actorType: 'SYSTEM', action: AuditActions.SETTINGS_UPDATED,
      resourceType: 'return_request', resourceId: returnRequestId,
      metadata: { status: 'REJECTED', note: dto?.note } }).catch(() => {})
    return PaymentReturnRmaCrudService.getById(tenantId, returnRequestId)
  }

  static async markReceived(tenantId: string, returnRequestId: string): Promise<ReturnRequestWithItems> {
    const { ds, row } = await PaymentReturnRmaCrudService.loadMutable(tenantId, returnRequestId)
    row.status = 'RECEIVED'
    if (!row.receivedAt) row.receivedAt = new Date()
    await ds.getRepository(ReturnRequestEntity).save(row)
    await PaymentReturnRmaCrudService.logEvent(ds, tenantId, returnRequestId, 'RECEIVED')
    return PaymentReturnRmaCrudService.getById(tenantId, returnRequestId)
  }

  static async refund(tenantId: string, returnRequestId: string, dto: RefundReturnDTO): Promise<ReturnRequestWithItems> {
    const { ds, row } = await PaymentReturnRmaCrudService.loadMutable(tenantId, returnRequestId)
    if (dto.refundAmount !== undefined && dto.refundAmount < 0) {
      throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.INVALID_REFUND_AMOUNT, 400, ErrorCode.VALIDATION_ERROR)
    }
    const paymentId = dto.paymentId ?? row.paymentId ?? undefined
    if (paymentId) {
      try {
        await PaymentSellService.refund(tenantId, paymentId, {
          ...(dto.refundAmount !== undefined ? { amount: dto.refundAmount } : {}),
          ...(dto.note ? { reason: dto.note } : {}),
        })
        row.paymentId = paymentId
      } catch (error) {
        Logger.error(`${PAYMENT_RETURN_RMA_MESSAGES.REFUND_FAILED}: ${error}`)
        throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.REFUND_FAILED, 502, ErrorCode.INTERNAL_ERROR)
      }
    }
    if (dto.refundAmount !== undefined) row.refundAmount = dto.refundAmount
    row.status = 'REFUNDED'
    if (!row.refundedAt) row.refundedAt = new Date()
    await ds.getRepository(ReturnRequestEntity).save(row)
    await PaymentReturnRmaCrudService.logEvent(ds, tenantId, returnRequestId, 'REFUNDED', dto.note)
    AuditLogService.log({ tenantId, actorType: 'SYSTEM', action: AuditActions.SETTINGS_UPDATED,
      resourceType: 'return_request', resourceId: returnRequestId,
      metadata: { status: 'REFUNDED', refundAmount: dto.refundAmount, note: dto.note } }).catch(() => {})
    return PaymentReturnRmaCrudService.getById(tenantId, returnRequestId)
  }

  static async complete(tenantId: string, returnRequestId: string): Promise<ReturnRequestWithItems> {
    const { ds, row } = await PaymentReturnRmaCrudService.loadMutable(tenantId, returnRequestId)
    row.status = 'COMPLETED'
    await ds.getRepository(ReturnRequestEntity).save(row)
    await PaymentReturnRmaCrudService.logEvent(ds, tenantId, returnRequestId, 'COMPLETED')
    return PaymentReturnRmaCrudService.getById(tenantId, returnRequestId)
  }

  static async cancel(tenantId: string, returnRequestId: string, reason?: string): Promise<ReturnRequestWithItems> {
    const { ds, row } = await PaymentReturnRmaCrudService.loadMutable(tenantId, returnRequestId)
    row.status = 'CANCELLED'
    if (!row.cancelledAt) row.cancelledAt = new Date()
    await ds.getRepository(ReturnRequestEntity).save(row)
    await PaymentReturnRmaCrudService.logEvent(ds, tenantId, returnRequestId, 'CANCELLED', reason)
    return PaymentReturnRmaCrudService.getById(tenantId, returnRequestId)
  }

  static async listEvents(tenantId: string, returnRequestId: string): Promise<ReturnEvent[]> {
    const ds = await tenantDataSourceFor(tenantId)
    const rows = await ds.getRepository(ReturnEventEntity).find({
      where: { tenantId, returnRequestId }, order: { createdAt: 'ASC' },
    })
    return rows.map((r) => ReturnEventSchema.parse(r))
  }
}
