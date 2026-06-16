import WalletCrudService from './wallet.crud.service';
import WalletPostingService from './wallet.posting.service';
import WalletReconcileService from './wallet.reconcile.service';

/**
 * Facade over the wallet sub-services. Import this for the common operations:
 * issue / transfer / spend, booking capture+refund, balance reads, and ledger
 * verification. Reach for a specific sub-service only when you need something
 * niche.
 */
export default class WalletService {
  // Accounts
  static ensureSystemAccounts = WalletCrudService.ensureSystemAccounts.bind(WalletCrudService);
  static getOrCreateUserWallet = WalletCrudService.getOrCreateUserWallet.bind(WalletCrudService);
  static getAccount = WalletCrudService.getAccount.bind(WalletCrudService);
  static getBalance = WalletCrudService.getBalance.bind(WalletCrudService);
  static listAccounts = WalletCrudService.listAccounts.bind(WalletCrudService);
  static listTransactions = WalletCrudService.listTransactions.bind(WalletCrudService);
  static getStatement = WalletCrudService.getStatement.bind(WalletCrudService);

  // Flows
  static issue = WalletPostingService.issue.bind(WalletPostingService);
  static transfer = WalletPostingService.transfer.bind(WalletPostingService);
  static spend = WalletPostingService.spend.bind(WalletPostingService);
  static captureForBooking = WalletPostingService.captureForBooking.bind(WalletPostingService);
  static refundForBooking = WalletPostingService.refundForBooking.bind(WalletPostingService);
  static postRaw = WalletPostingService.postRaw.bind(WalletPostingService);

  // Integrity
  static verifyChain = WalletReconcileService.verifyChain.bind(WalletReconcileService);
  static reconcile = WalletReconcileService.reconcile.bind(WalletReconcileService);
}
