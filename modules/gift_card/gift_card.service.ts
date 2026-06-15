import GiftCardCrudService from './gift_card.crud.service';
import GiftCardRedemptionService from './gift_card.redemption.service';

export { GiftCardCrudService, GiftCardRedemptionService };

/**
 * Facade over the gift-card sub-services. Issue / read / void / adjust live in
 * the CRUD service; balance check, redemption (wallet credit) and
 * payment-backed issuing live in the redemption service.
 */
export default class GiftCardService {
  // Lifecycle
  static issue = GiftCardCrudService.issue.bind(GiftCardCrudService);
  static getAll = GiftCardCrudService.getAll.bind(GiftCardCrudService);
  static getById = GiftCardCrudService.getById.bind(GiftCardCrudService);
  static getByCode = GiftCardCrudService.getByCode.bind(GiftCardCrudService);
  static listTransactions = GiftCardCrudService.listTransactions.bind(GiftCardCrudService);
  static void = GiftCardCrudService.void.bind(GiftCardCrudService);
  static adjust = GiftCardCrudService.adjust.bind(GiftCardCrudService);

  // Balance & redemption
  static checkBalance = GiftCardRedemptionService.checkBalance.bind(GiftCardRedemptionService);
  static redeem = GiftCardRedemptionService.redeem.bind(GiftCardRedemptionService);
  static issueForCompletedPayment = GiftCardRedemptionService.issueForCompletedPayment.bind(GiftCardRedemptionService);
}
