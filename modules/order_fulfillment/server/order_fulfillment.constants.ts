import type { FulfillmentStatus } from './order_fulfillment.enums'

// Statuses that are terminal — no further transitions are allowed out of them.
export const TERMINAL_STATUSES: ReadonlySet<FulfillmentStatus> = new Set(['DELIVERED', 'CANCELLED', 'RETURNED'])

// Every status maps to a webhook event so internal integrations and customer
// notifications fire on each transition (previously only SHIPPED/DELIVERED/
// CANCELLED emitted).
export const STATUS_WEBHOOK: Record<FulfillmentStatus, string> = {
  PENDING: 'fulfillment.created',
  PROCESSING: 'fulfillment.processing',
  BACKORDERED: 'fulfillment.backordered',
  PACKED: 'fulfillment.packed',
  SHIPPED: 'fulfillment.shipped',
  IN_TRANSIT: 'fulfillment.in_transit',
  DELIVERED: 'fulfillment.delivered',
  CANCELLED: 'fulfillment.cancelled',
  RETURNED: 'fulfillment.returned',
}

export const cacheKey = (fulfillmentId: string) => `order:fulfillment:${fulfillmentId}`
