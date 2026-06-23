export const ACCOUNTING_MESSAGES = {
  ACCOUNT_NOT_FOUND: 'Ledger account not found',
  ENTRY_NOT_FOUND: 'Journal entry not found',
  LINE_NOT_FOUND: 'Journal line not found',
  PERIOD_NOT_FOUND: 'Fiscal period not found',
  JOURNAL_NOT_FOUND: 'Journal not found',
  ACCOUNT_CREATE_FAILED: 'Failed to create ledger account',
  ENTRY_CREATE_FAILED: 'Failed to create journal entry',
  PERIOD_CREATE_FAILED: 'Failed to create fiscal period',
  JOURNAL_CREATE_FAILED: 'Failed to create journal',
  LINE_CREATE_FAILED: 'Failed to create journal line',
  INVALID_TRANSITION: 'Invalid status transition for this entry',
  NOT_BALANCED: 'Cannot post: debit must equal credit and be greater than zero',
} as const
