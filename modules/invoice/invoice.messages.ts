const InvoiceMessages = {
  NOT_FOUND: 'Invoice not found',
  CREATE_FAILED: 'Failed to create invoice',
  ISSUE_FAILED: 'Failed to issue invoice',
  ALREADY_ISSUED: 'Invoice has already been issued',
  ALREADY_PAID: 'Invoice has already been paid',
  CANNOT_VOID_PAID: 'Cannot void an invoice that has been paid (refund instead)',
  LINE_INVALID: 'Invalid invoice line — quantity must be positive and unitPrice non-negative',
  REGIONAL_ADAPTER_FAILED: 'Regional invoice submission failed',
  REGIONAL_ADAPTER_NOT_CONFIGURED: 'Regional invoice adapter is not configured for this tenant',
  COMPANY_INFO_MISSING: 'Tenant company info is incomplete — set companyLegalName/companyTaxId/companyCountryCode in Settings',
  FETCH_FAILED: 'Failed to fetch invoices',
};
export default InvoiceMessages;
