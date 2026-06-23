export const METERING_MESSAGES = {
  METER_NOT_FOUND: 'Meter definition not found',
  METER_KEY_CONFLICT: 'A meter with this key already exists for the tenant',
  METER_INACTIVE: 'Meter definition is not active',

  BILLING_RUN_NOT_FOUND: 'Metered billing run not found',
  INVALID_QUANTITY: 'Usage quantity must be a positive integer',

  RUN_NOT_DRAFT: 'Only a DRAFT run can be calculated',
  RUN_NOT_CALCULATED: 'Only a CALCULATED run can be billed',

  RECORD_FAILED: 'Failed to record usage event',
  BILLING_FAILED: 'Failed to run metered billing',
  INVOICE_CUSTOMER_REQUIRED:
    'Invoicing the remainder needs customer details (email, name, country) on the billing request',
} as const;
