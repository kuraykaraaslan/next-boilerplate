export const ORDER_MESSAGES = {
  ORDER_NOT_FOUND: 'Order not found',
  ORDER_LINE_NOT_FOUND: 'Order line not found',
  ORDER_STATUS_EVENT_NOT_FOUND: 'Order status event not found',
  ORDER_NUMBER_TAKEN: 'An order with this number already exists',
  ORDER_CREATE_FAILED: 'Failed to create order',
  ORDER_LINE_CREATE_FAILED: 'Failed to create order line',
  ORDER_STATUS_EVENT_CREATE_FAILED: 'Failed to create order status event',
  ORDER_TRANSITION_INVALID: 'Order cannot transition from its current status',
} as const
