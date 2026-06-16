import 'reflect-metadata';
import type { WalletTransactionWithPostings } from './wallet.types';
import type {
  CaptureDTO,
  IssueCreditsDTO,
  PostTransactionDTO,
  SpendCreditsDTO,
  TransferCreditsDTO,
} from './wallet.dto';
import { postTransaction, type InternalInput } from './wallet.posting.core';
import {
  issue, transfer, spend, captureForBooking, refundForBooking, postRaw,
} from './wallet.posting.flows';

/**
 * Wallet double-entry posting service facade. The core ledger engine lives in
 * `wallet.posting.core` and the high-level flows in `wallet.posting.flows`;
 * this class preserves the single `WalletPostingService.*` entry point.
 */
export default class WalletPostingService {
  static postTransaction(tenantId: string, input: InternalInput): Promise<WalletTransactionWithPostings> {
    return postTransaction(tenantId, input);
  }

  static issue(tenantId: string, dto: IssueCreditsDTO): Promise<WalletTransactionWithPostings> {
    return issue(tenantId, dto);
  }

  static transfer(tenantId: string, dto: TransferCreditsDTO): Promise<WalletTransactionWithPostings> {
    return transfer(tenantId, dto);
  }

  static spend(tenantId: string, dto: SpendCreditsDTO): Promise<WalletTransactionWithPostings> {
    return spend(tenantId, dto);
  }

  static captureForBooking(tenantId: string, dto: CaptureDTO): Promise<WalletTransactionWithPostings> {
    return captureForBooking(tenantId, dto);
  }

  static refundForBooking(tenantId: string, dto: CaptureDTO): Promise<WalletTransactionWithPostings> {
    return refundForBooking(tenantId, dto);
  }

  static postRaw(tenantId: string, dto: PostTransactionDTO): Promise<WalletTransactionWithPostings> {
    return postRaw(tenantId, dto);
  }
}
