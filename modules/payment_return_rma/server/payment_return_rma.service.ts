import PaymentReturnRmaCrudService from './payment_return_rma.crud.service';
import PaymentReturnRmaLifecycleService from './payment_return_rma.lifecycle.service';
import PaymentReturnRmaPolicyService from './payment_return_rma.policy.service';

export { PaymentReturnRmaCrudService, PaymentReturnRmaLifecycleService, PaymentReturnRmaPolicyService };

export default class PaymentReturnRmaService {

  // CRUD
  static create        = PaymentReturnRmaCrudService.create.bind(PaymentReturnRmaCrudService);
  static getById       = PaymentReturnRmaCrudService.getById.bind(PaymentReturnRmaCrudService);
  static list          = PaymentReturnRmaCrudService.list.bind(PaymentReturnRmaCrudService);
  static update        = PaymentReturnRmaCrudService.update.bind(PaymentReturnRmaCrudService);

  // Lifecycle
  static approve       = PaymentReturnRmaLifecycleService.approve.bind(PaymentReturnRmaLifecycleService);
  static reject        = PaymentReturnRmaLifecycleService.reject.bind(PaymentReturnRmaLifecycleService);
  static markReceived  = PaymentReturnRmaLifecycleService.markReceived.bind(PaymentReturnRmaLifecycleService);
  static refund        = PaymentReturnRmaLifecycleService.refund.bind(PaymentReturnRmaLifecycleService);
  static complete      = PaymentReturnRmaLifecycleService.complete.bind(PaymentReturnRmaLifecycleService);
  static cancel        = PaymentReturnRmaLifecycleService.cancel.bind(PaymentReturnRmaLifecycleService);
  static listEvents    = PaymentReturnRmaLifecycleService.listEvents.bind(PaymentReturnRmaLifecycleService);
  static setTracking   = PaymentReturnRmaLifecycleService.setTracking.bind(PaymentReturnRmaLifecycleService);
  static sweepSlaBreaches = PaymentReturnRmaLifecycleService.sweepSlaBreaches.bind(PaymentReturnRmaLifecycleService);

  // Policy / retention
  static getPolicy       = PaymentReturnRmaPolicyService.getPolicy.bind(PaymentReturnRmaPolicyService);
  static purgeOldReturns = PaymentReturnRmaCrudService.purgeOldReturns.bind(PaymentReturnRmaCrudService);
}
