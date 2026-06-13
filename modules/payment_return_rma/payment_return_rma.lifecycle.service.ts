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
import PaymentReturnRmaPolicyService from './payment_return_rma.policy.service'
import { PaymentLoyaltyPointsService } from '@/modules/payment_loyalty_points'
import { tenantDataSourceFor } from '@/modules/db'

export default class PaymentReturnRmaLifecycleService {

  static async approve(tenantId: string, returnRequestId: string, dto?: ModerateReturnDTO): Promise<ReturnRequestWithItems> {
    const { ds, row } = await PaymentReturnRmaCrudService.loadMutable(tenantId, returnRequestId)
    row.status = 'APPROVED'
    if (!row.approvedAt) row.approvedAt = new Date()
    await ds.getRepository(ReturnRequestEntity).save(row)
    await PaymentReturnRmaCrudService.logEvent(ds, tenantId, returnRequestId, 'APPROVED', dto?.note)
    PaymentReturnRmaLifecycleService.notify(tenantId, row.userId, row.rmaNumber, 'APPROVED').catch(() => {})
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
    PaymentReturnRmaLifecycleService.notify(tenantId, row.userId, row.rmaNumber, 'REJECTED').catch(() => {})
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
    PaymentReturnRmaLifecycleService.notify(tenantId, row.userId, row.rmaNumber, 'RECEIVED').catch(() => {})
    return PaymentReturnRmaCrudService.getById(tenantId, returnRequestId)
  }

  static async refund(tenantId: string, returnRequestId: string, dto: RefundReturnDTO): Promise<ReturnRequestWithItems> {
    const { ds, row } = await PaymentReturnRmaCrudService.loadMutable(tenantId, returnRequestId)
    if (dto.refundAmount !== undefined && dto.refundAmount < 0) {
      throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.INVALID_REFUND_AMOUNT, 400, ErrorCode.VALIDATION_ERROR)
    }

    const policy = await PaymentReturnRmaPolicyService.getPolicy(tenantId)
    const method = dto.refundMethod ?? policy.defaultRefundMethod
    // Restocking fee is deducted from the gross refund (deduct only when an
    // amount is known to deduct from).
    const gross = dto.refundAmount
    const fee = gross !== undefined ? PaymentReturnRmaPolicyService.restockingFee(policy, gross) : 0
    const net = gross !== undefined ? Math.max(0, Math.round((gross - fee) * 100) / 100) : undefined

    const paymentId = dto.paymentId ?? row.paymentId ?? undefined
    // Only CASH refunds hit the payment provider; store credit / gift card are
    // issued out-of-band (recorded here for the wallet/loyalty module).
    if (method === 'CASH' && paymentId) {
      try {
        await PaymentSellService.refund(tenantId, paymentId, {
          ...(net !== undefined ? { amount: net } : {}),
          ...(dto.note ? { reason: dto.note } : {}),
        })
        row.paymentId = paymentId
      } catch (error) {
        Logger.error(`${PAYMENT_RETURN_RMA_MESSAGES.REFUND_FAILED}: ${error}`)
        throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.REFUND_FAILED, 502, ErrorCode.INTERNAL_ERROR)
      }
    }

    // Claw back loyalty points earned on the original purchase (real ledger
    // adjustment; best-effort so a loyalty hiccup never blocks the refund).
    if (dto.loyaltyPointsToReverse && dto.loyaltyPointsToReverse > 0 && row.userId) {
      PaymentLoyaltyPointsService.adjust(tenantId, {
        userId: row.userId,
        points: -dto.loyaltyPointsToReverse,
        reason: `Return refund ${row.rmaNumber}`,
      }).catch((e: unknown) => Logger.warn(`[rma] loyalty reversal failed: ${e instanceof Error ? e.message : String(e)}`))
    }

    if (net !== undefined) row.refundAmount = net
    row.restockingFee = fee || undefined
    row.refundMethod = method
    row.status = 'REFUNDED'
    if (!row.refundedAt) row.refundedAt = new Date()
    await ds.getRepository(ReturnRequestEntity).save(row)
    await PaymentReturnRmaCrudService.logEvent(ds, tenantId, returnRequestId, 'REFUNDED', dto.note)
    AuditLogService.log({ tenantId, actorType: 'SYSTEM', action: AuditActions.SETTINGS_UPDATED,
      resourceType: 'return_request', resourceId: returnRequestId,
      metadata: { status: 'REFUNDED', refundAmount: net, restockingFee: fee, method, note: dto.note } }).catch(() => {})
    PaymentReturnRmaLifecycleService.notify(tenantId, row.userId, row.rmaNumber, 'REFUNDED').catch(() => {})
    return PaymentReturnRmaCrudService.getById(tenantId, returnRequestId)
  }

  /**
   * Customer email on a status transition (best-effort). Resolves the user's
   * email and sends a branded RMA-status mail; silently skips when there's no
   * user/email so notifications never block the state machine.
   */
  private static async notify(tenantId: string, userId: string | undefined, rmaNumber: string, status: string): Promise<void> {
    if (!userId) return
    try {
      const { default: UserService } = await import('@/modules/user/user.service')
      const user = await UserService.getById(userId).catch(() => null)
      const email = (user as { email?: string } | null)?.email
      if (!email) return
      const { default: NotificationMailQueueService } = await import('@/modules/notification_mail/notification_mail.queue.service')
      await NotificationMailQueueService.sendMail(
        tenantId, email,
        `Return ${rmaNumber}: ${status}`,
        `<p>Your return <strong>${rmaNumber}</strong> is now <strong>${status}</strong>.</p>`,
      )
    } catch (err) {
      Logger.warn(`[rma] status notification failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /** Attach return shipment tracking (and optional prepaid label) to an RMA. */
  static async setTracking(tenantId: string, returnRequestId: string, data: { carrier?: string; trackingNumber?: string; labelUrl?: string }): Promise<ReturnRequestWithItems> {
    const { ds, row } = await PaymentReturnRmaCrudService.loadMutable(tenantId, returnRequestId)
    if (data.carrier !== undefined) row.returnCarrier = data.carrier
    if (data.trackingNumber !== undefined) row.returnTrackingNumber = data.trackingNumber
    if (data.labelUrl !== undefined) row.returnLabelUrl = data.labelUrl
    await ds.getRepository(ReturnRequestEntity).save(row)
    await PaymentReturnRmaCrudService.logEvent(ds, tenantId, returnRequestId, row.status as never, `Tracking: ${data.carrier ?? ''} ${data.trackingNumber ?? ''}`.trim())
    return PaymentReturnRmaCrudService.getById(tenantId, returnRequestId)
  }

  /**
   * SLA escalation sweep: returns past their `slaDueAt` still in a non-terminal
   * state. Intended for a scheduled job to alert/escalate. Returns the overdue
   * RMA ids.
   */
  static async sweepSlaBreaches(tenantId: string): Promise<string[]> {
    const ds = await tenantDataSourceFor(tenantId)
    const now = new Date()
    const rows = await ds.getRepository(ReturnRequestEntity).find({ where: { tenantId } })
    const breached = rows.filter((r) => r.slaDueAt && new Date(r.slaDueAt) < now && !['COMPLETED', 'CANCELLED', 'REJECTED', 'REFUNDED'].includes(r.status))
    for (const r of breached) {
      AuditLogService.log({ tenantId, actorType: 'SYSTEM', action: AuditActions.SETTINGS_UPDATED,
        resourceType: 'return_request', resourceId: r.returnRequestId,
        metadata: { slaBreached: true, status: r.status, slaDueAt: r.slaDueAt } }).catch(() => {})
    }
    return breached.map((r) => r.returnRequestId)
  }

  static async complete(tenantId: string, returnRequestId: string): Promise<ReturnRequestWithItems> {
    const { ds, row } = await PaymentReturnRmaCrudService.loadMutable(tenantId, returnRequestId)
    row.status = 'COMPLETED'
    await ds.getRepository(ReturnRequestEntity).save(row)
    await PaymentReturnRmaCrudService.logEvent(ds, tenantId, returnRequestId, 'COMPLETED')
    PaymentReturnRmaLifecycleService.notify(tenantId, row.userId, row.rmaNumber, 'COMPLETED').catch(() => {})
    return PaymentReturnRmaCrudService.getById(tenantId, returnRequestId)
  }

  static async cancel(tenantId: string, returnRequestId: string, reason?: string): Promise<ReturnRequestWithItems> {
    const { ds, row } = await PaymentReturnRmaCrudService.loadMutable(tenantId, returnRequestId)
    row.status = 'CANCELLED'
    if (!row.cancelledAt) row.cancelledAt = new Date()
    await ds.getRepository(ReturnRequestEntity).save(row)
    await PaymentReturnRmaCrudService.logEvent(ds, tenantId, returnRequestId, 'CANCELLED', reason)
    PaymentReturnRmaLifecycleService.notify(tenantId, row.userId, row.rmaNumber, 'CANCELLED').catch(() => {})
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
