import PaymentLoyaltyPointsAccountService from './payment_loyalty_points.account.service';
import PaymentLoyaltyPointsLedgerService from './payment_loyalty_points.ledger.service';

export { PaymentLoyaltyPointsAccountService, PaymentLoyaltyPointsLedgerService };

export default class PaymentLoyaltyPointsService {

  // ──────────────────────────────────────────────
  // Accounts
  // ──────────────────────────────────────────────

  static getOrCreateAccount = PaymentLoyaltyPointsAccountService.getOrCreateAccount.bind(PaymentLoyaltyPointsAccountService);
  static getAccount         = PaymentLoyaltyPointsAccountService.getAccount.bind(PaymentLoyaltyPointsAccountService);
  static getBalance         = PaymentLoyaltyPointsAccountService.getBalance.bind(PaymentLoyaltyPointsAccountService);

  // ──────────────────────────────────────────────
  // Tiers
  // ──────────────────────────────────────────────

  static createTier   = PaymentLoyaltyPointsAccountService.createTier.bind(PaymentLoyaltyPointsAccountService);
  static updateTier   = PaymentLoyaltyPointsAccountService.updateTier.bind(PaymentLoyaltyPointsAccountService);
  static listTiers    = PaymentLoyaltyPointsAccountService.listTiers.bind(PaymentLoyaltyPointsAccountService);
  static recomputeTier = PaymentLoyaltyPointsLedgerService.recomputeTier.bind(PaymentLoyaltyPointsLedgerService);

  // ──────────────────────────────────────────────
  // Ledger
  // ──────────────────────────────────────────────

  static earn             = PaymentLoyaltyPointsLedgerService.earn.bind(PaymentLoyaltyPointsLedgerService);
  static redeem           = PaymentLoyaltyPointsLedgerService.redeem.bind(PaymentLoyaltyPointsLedgerService);
  static adjust           = PaymentLoyaltyPointsLedgerService.adjust.bind(PaymentLoyaltyPointsLedgerService);
  static listTransactions = PaymentLoyaltyPointsLedgerService.listTransactions.bind(PaymentLoyaltyPointsLedgerService);
  static expirePoints     = PaymentLoyaltyPointsLedgerService.expirePoints.bind(PaymentLoyaltyPointsLedgerService);
}
