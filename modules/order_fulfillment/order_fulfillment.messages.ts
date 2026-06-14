export const ORDER_FULFILLMENT_MESSAGES = {
  FULFILLMENT_NOT_FOUND: 'Fulfillment not found',
  FULFILLMENT_CREATE_FAILED: 'Failed to create fulfillment',
  FULFILLMENT_ALREADY_DELIVERED: 'Fulfillment has already been delivered',
  FULFILLMENT_ALREADY_CANCELLED: 'Fulfillment has already been cancelled',

  INVALID_STATUS_TRANSITION: 'Invalid fulfillment status transition',

  ITEMS_REQUIRED: 'At least one fulfillment item is required',

  TRACKING_REQUIRED: 'Tracking number and carrier are required',

  EVENT_LOG_FAILED: 'Failed to log fulfillment event',

  CARRIER_NOT_ALLOWED: 'This carrier is not enabled for your tenant',
  WAREHOUSE_NOT_FOUND: 'Warehouse not found',
  WAREHOUSE_CODE_TAKEN: 'A warehouse with this code already exists',
  TRACKING_NOT_AVAILABLE: 'Live tracking is not available for this shipment',
  DANGEROUS_GOODS_INCOMPLETE: 'Dangerous goods items require a hazmat class and UN number',
  PUBLIC_TRACKING_NOT_FOUND: 'No shipment found for this tracking link',
  LABEL_NOT_AVAILABLE: 'Label generation is not available for this carrier (unconfigured or unsupported)',
  LABEL_ADDRESS_REQUIRED: 'Both a from and a to address are required to generate a label',
  CARRIER_REQUIRED: 'A carrier must be set on the fulfillment before generating a label',
} as const
