import type { DataSource } from 'typeorm'
import Logger from '@nb/logger'
import { FulfillmentEvent as FulfillmentEventEntity } from './entities/fulfillment_event.entity'
import type { FulfillmentStatus } from './order_fulfillment.enums'
import { ORDER_FULFILLMENT_MESSAGES } from './order_fulfillment.messages'

/** Append an event row to a fulfillment's timeline. Best-effort; never throws. */
export async function logEvent(
  ds: DataSource,
  tenantId: string,
  fulfillmentId: string,
  status: FulfillmentStatus,
  message?: string,
): Promise<void> {
  try {
    const repo = ds.getRepository(FulfillmentEventEntity)
    const event = repo.create({ tenantId, fulfillmentId, status, message })
    await repo.save(event)
  } catch (error) {
    Logger.error(`${ORDER_FULFILLMENT_MESSAGES.EVENT_LOG_FAILED}: ${error}`)
  }
}
