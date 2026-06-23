import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import { SubscriptionEvent } from './entities/subscription_event.entity'

/** Tenant-scoped lifecycle audit trail for subscriptions. */
export default class PaymentSubscriptionEventService {
  /** Append one transition row. Best-effort; never blocks the workflow. */
  static async append(
    tenantId: string,
    subscriptionId: string,
    status: string,
    action: string,
    note?: string,
  ): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SubscriptionEvent)
    await repo.save(repo.create({ tenantId, subscriptionId, status, action, note }))
  }

  static async listByParent(
    tenantId: string,
    subscriptionId: string,
  ): Promise<{ data: SubscriptionEvent[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const [data, total] = await ds.getRepository(SubscriptionEvent).findAndCount({
      where: { tenantId, subscriptionId },
      order: { createdAt: 'DESC' },
    })
    return { data, total }
  }
}
