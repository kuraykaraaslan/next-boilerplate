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
  PROVIDER_PDF_UNAVAILABLE: 'The provider-issued invoice PDF could not be retrieved',
  // TR e-Arşiv (GİB direct portal) SMS finalisation
  EARSIV_NOT_GIB_DIRECT: 'e-Arşiv SMS signing is only available with the gib_direct integrator',
  EARSIV_NOT_CONFIGURED: 'e-Arşiv (gib_direct) is not configured — set TCKN/VKN + password in Settings → Invoicing',
  EARSIV_SMS_SEND_FAILED: 'Failed to request an e-Arşiv SMS code from the GİB portal',
  EARSIV_SMS_VERIFY_FAILED: 'Failed to verify the e-Arşiv SMS code',
  EARSIV_NO_DRAFTS: 'No matching unsigned e-Arşiv drafts were found at the GİB portal for the selected invoices',
};
export default InvoiceMessages;
