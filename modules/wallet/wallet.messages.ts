export const WALLET_MESSAGES = {
  NOT_BALANCED: 'Wallet transaction is not balanced (postings must sum to zero per currency)',
  INVALID_ENTRIES: 'A wallet transaction needs at least two distinct accounts',
  MIXED_CURRENCY: 'All postings in a transaction must share one currency',
  INSUFFICIENT_FUNDS: 'Insufficient wallet balance',
  ACCOUNT_NOT_FOUND: 'Wallet account not found',
  ACCOUNT_INACTIVE: 'Wallet account is not active',
  CURRENCY_MISMATCH: 'Posting currency does not match account currency',
  SAME_ACCOUNT_TRANSFER: 'Cannot transfer to the same wallet',

  POST_FAILED: 'Failed to post wallet transaction',
  TRANSFER_FAILED: 'Failed to transfer credits',
  ISSUE_FAILED: 'Failed to issue credits',
} as const;
