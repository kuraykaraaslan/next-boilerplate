import { z } from 'zod';

/**
 * Wallet (internal credit ledger) enums.
 *
 * The wallet is a double-entry ledger: every movement is a balanced
 * `WalletTransaction` whose signed `WalletPosting` legs sum to zero per
 * currency. Account `kind` distinguishes user-held credit wallets from the
 * system contra-accounts that make double entry balance.
 */

// Who owns an account.
export const OwnerTypeEnum = z.enum(['USER', 'SYSTEM', 'TENANT']);
export type OwnerType = z.infer<typeof OwnerTypeEnum>;

// Account role in the ledger. USER_WALLET is a real user balance; the SYSTEM_*
// kinds are the contra-accounts double entry posts against.
export const AccountKindEnum = z.enum([
  'USER_WALLET',
  'SYSTEM_ISSUER', // credits are minted from / burned to here
  'SYSTEM_REVENUE', // spends land here
  'SYSTEM_ESCROW', // booking captures held here until settled
  'SYSTEM_FEE', // platform fees
]);
export type AccountKind = z.infer<typeof AccountKindEnum>;

export const AccountStatusEnum = z.enum(['ACTIVE', 'FROZEN', 'CLOSED']);
export type AccountStatus = z.infer<typeof AccountStatusEnum>;

// Transaction type — descriptive label for a balanced movement.
export const TransactionTypeEnum = z.enum([
  'ISSUE', // mint credit to a user wallet (admin / purchase)
  'TRANSFER', // user -> user
  'SPEND', // user -> system revenue
  'REFUND', // system revenue -> user
  'BOOKING_CAPTURE', // user -> escrow (a confirmed booking)
  'BOOKING_REFUND', // escrow -> user (a cancelled booking)
  'ADJUSTMENT', // manual correction
  'FEE', // platform fee leg
]);
export type TransactionType = z.infer<typeof TransactionTypeEnum>;
